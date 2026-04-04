import { GoogleGenAI } from '@google/genai';
import {
  buildStatementParserPrompt,
  validateParsedStatement,
  type ParsedStatementResult,
} from '@/lib/statements';
import type { StatementType } from '@/lib/statements';

const TIMEOUT_MS = 25_000;

export type GeminiStatementParseOutcome =
  | { ok: true; data: ParsedStatementResult }
  | { ok: false; code: 'timeout' | 'gemini_error'; detail?: string };

/**
 * Runs Gemini structured extraction on PDF text with a wall-clock timeout.
 */
export async function runGeminiStatementParse(
  pdfText: string,
  statementType: StatementType
): Promise<GeminiStatementParseOutcome> {
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  try {
    const geminiPromise = genai.models
      .generateContent({
        model: 'gemini-2.5-flash',
        config: {
          thinkingConfig: { thinkingBudget: 0 },
        },
        contents: [
          {
            role: 'user',
            parts: [
              { text: buildStatementParserPrompt(statementType) },
              {
                text: `Parse this statement and return JSON:\n\n${pdfText.slice(0, 30_000)}`,
              },
            ],
          },
        ],
      })
      .then((res) => {
        const parts = res.candidates?.[0]?.content?.parts ?? [];
        const raw =
          parts.find(
            (p) => (p.text && p.text.trim().startsWith('{')) || p.text?.includes('"transactions"')
          )?.text ??
          parts.find((p) => p.text)?.text ??
          '';
        const json = raw
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        return validateParsedStatement(JSON.parse(json), statementType);
      });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), TIMEOUT_MS)
    );

    const data = await Promise.race([geminiPromise, timeoutPromise]);
    return { ok: true, data };
  } catch (err) {
    const isTimeout = err instanceof Error && err.message === 'GEMINI_TIMEOUT';
    if (isTimeout) {
      return { ok: false, code: 'timeout' };
    }
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, code: 'gemini_error', detail };
  }
}

export { TIMEOUT_MS };
