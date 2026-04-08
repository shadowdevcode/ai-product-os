/**
 * Async Gemini helper: short merchant display label from sample transaction text.
 * Never on upload critical path — intended for cron / batch only.
 */

import { GoogleGenAI } from '@google/genai';

const TIMEOUT_MS = 9_000;

const responseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    suggested_label: { type: 'string' },
    confidence: { type: 'number' },
  },
  required: ['suggested_label', 'confidence'],
} as const;

export type MerchantLabelEnrichOutcome =
  | { ok: true; suggested_label: string; confidence: number; latency_ms: number }
  | { ok: false; code: 'timeout' | 'gemini_error' | 'validation'; detail?: string };

/**
 * Produces a short human-readable merchant name for Indian bank/UPI statement lines.
 */
export async function suggestMerchantLabelFromSamples(
  merchantKey: string,
  sampleDescriptions: string[]
): Promise<MerchantLabelEnrichOutcome> {
  if (!process.env.GEMINI_API_KEY) {
    return { ok: false, code: 'validation', detail: 'GEMINI_API_KEY not set' };
  }

  const samples = sampleDescriptions
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
  if (samples.length === 0) {
    return { ok: false, code: 'validation', detail: 'no samples' };
  }

  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `You label merchants for an Indian personal finance app.

Normalized key (internal): ${merchantKey}

Sample transaction description lines (may include UPI VPAs, bank codes, noise):
${JSON.stringify(samples, null, 0)}

Return JSON only matching the schema.
Rules:
- suggested_label: 2–40 characters, Title Case where natural, no rupee amounts or dates.
- confidence: 0.0–1.0 how sure the label matches the samples.
- If samples are too noisy, still pick the best short label and lower confidence.`;

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
        return JSON.parse(json) as { suggested_label: string; confidence: number };
      });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), TIMEOUT_MS)
    );

    const parsed = await Promise.race([geminiPromise, timeoutPromise]);
    const latency_ms = Date.now() - started;

    const label = parsed.suggested_label?.trim() ?? '';
    if (label.length < 2 || label.length > 120) {
      return { ok: false, code: 'validation', detail: 'bad label length' };
    }
    let confidence = Number(parsed.confidence);
    if (Number.isNaN(confidence)) {
      confidence = 0.5;
    }
    confidence = Math.min(1, Math.max(0, confidence));

    return { ok: true, suggested_label: label, confidence, latency_ms };
  } catch (err) {
    const isTimeout = err instanceof Error && err.message === 'GEMINI_TIMEOUT';
    if (isTimeout) {
      return { ok: false, code: 'timeout' };
    }
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, code: 'gemini_error', detail };
  }
}
