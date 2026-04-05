import { GoogleGenAI } from '@google/genai';
import type { Advisory } from '@/lib/advisory-engine';
import {
  factIdsFromLayerA,
  serializeFactsForPrompt,
  validateCitedFactIds,
  type LayerAFacts,
} from '@/lib/coaching-facts';

// NOTE: GoogleGenAI SDK does not expose AbortSignal on generateContent, so we cannot
// cancel the underlying HTTP request on timeout — the race rejects but Gemini continues.
// Timeout capped at 9s per Engineering Lesson #15 (Vercel serverless limit).
const TIMEOUT_MS = 9_000;

const responseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          advisory_id: { type: 'string' },
          narrative: { type: 'string' },
          cited_fact_ids: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['advisory_id', 'narrative', 'cited_fact_ids'],
      },
    },
  },
  required: ['items'],
} as const;

export type CoachingNarrativeOutcome =
  | { ok: true; advisories: Advisory[]; latency_ms: number }
  | { ok: false; code: 'timeout' | 'gemini_error' | 'validation'; detail?: string };

/**
 * Gemini narrative step: structured JSON only; citations must reference Layer A fact ids.
 * Single emission source: server-side in /api/dashboard (not duplicated on client).
 */
export async function runGeminiCoachingNarratives(
  advisories: Advisory[],
  facts: LayerAFacts
): Promise<CoachingNarrativeOutcome> {
  if (!process.env.GEMINI_API_KEY || advisories.length === 0) {
    return { ok: true, advisories, latency_ms: 0 };
  }

  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const allowed = factIdsFromLayerA(facts);
  const factsJson = serializeFactsForPrompt(facts);
  const advisoryBrief = advisories.map((a) => ({
    id: a.id,
    trigger: a.trigger,
    headline: a.headline,
    severity: a.severity,
  }));

  const prompt = `You are a MoneyMirror coaching copywriter for Indian users (educational, not investment advice).

Facts JSON (authoritative numbers — do not invent amounts or percentages):
${factsJson}

Advisory cards to rewrite (one narrative each):
${JSON.stringify(advisoryBrief, null, 0)}

Rules:
- Output JSON only matching the response schema.
- For each advisory_id, write 2–4 sentences: observation, why it matters, one gentle next step.
- Do not recommend buying or selling specific securities.
- cited_fact_ids must list the fact "id" strings your narrative depends on (non-empty subset of the facts above).
- Do not include rupee digits or ₹ in the narrative text — refer to concepts only; figures appear in Sources from facts.
- Match every advisory_id exactly once.`;

  const started = Date.now();

  try {
    const geminiPromise = genai.models
      .generateContent({
        model: 'gemini-2.5-flash',
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseJsonSchema,
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      })
      .then((res) => {
        const parts = res.candidates?.[0]?.content?.parts ?? [];
        const raw =
          parts.find((p) => p.text?.trim().startsWith('{'))?.text ??
          parts.find((p) => p.text)?.text ??
          '';
        const json = raw
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        return JSON.parse(json) as {
          items: Array<{ advisory_id: string; narrative: string; cited_fact_ids: string[] }>;
        };
      });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), TIMEOUT_MS)
    );

    const parsed = await Promise.race([geminiPromise, timeoutPromise]);
    const latency_ms = Date.now() - started;

    const byId = new Map(parsed.items.map((i) => [i.advisory_id, i]));
    const merged: Advisory[] = advisories.map((a) => {
      const row = byId.get(a.id);
      if (!row) {
        return a;
      }
      const narrative = row.narrative?.trim() ?? '';
      if (narrative.length < 12 || narrative.length > 2000) {
        return a;
      }
      const check = validateCitedFactIds(row.cited_fact_ids, allowed);
      if (!check.ok) {
        return a;
      }
      return {
        ...a,
        narrative,
        cited_fact_ids: row.cited_fact_ids,
      };
    });

    return { ok: true, advisories: merged, latency_ms };
  } catch (err) {
    const isTimeout = err instanceof Error && err.message === 'GEMINI_TIMEOUT';
    if (isTimeout) {
      return { ok: false, code: 'timeout' };
    }
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, code: 'gemini_error', detail };
  }
}
