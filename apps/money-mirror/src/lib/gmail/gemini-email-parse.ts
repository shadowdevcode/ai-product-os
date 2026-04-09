import { GoogleGenAI } from '@google/genai';

const TIMEOUT_MS = 15_000;

export interface ParsedEmailTx {
  found: true;
  amount: number; // rupees as decimal
  type: 'debit' | 'credit';
  merchant: string; // max 80 chars
  date: string; // YYYY-MM-DD
  channel: 'UPI' | 'CC' | 'NEFT' | 'IMPS' | 'ATM' | 'OTHER';
  upi_handle: string | null;
  bank: string;
}

export type EmailParseOutcome = ParsedEmailTx | { found: false };

const PARSE_PROMPT = `You are parsing an Indian bank or UPI transaction alert email.
Extract the single transaction described. Return ONLY valid JSON, no markdown, no backticks.

Required schema:
{
  "found": boolean,
  "amount": number,
  "type": "debit" | "credit",
  "merchant": string,
  "date": "YYYY-MM-DD",
  "channel": "UPI" | "CC" | "NEFT" | "IMPS" | "ATM" | "OTHER",
  "upi_handle": string | null,
  "bank": string
}

Rules:
- amount is the numeric value EXACTLY as printed in the email (e.g. 1250.00, 11.80). NEVER convert currencies. If the email says USD11.80, amount = 11.80. If it says Rs.1,250.00, amount = 1250.00.
- merchant is the payee or merchant name, max 80 characters, no account numbers
- date must be YYYY-MM-DD; if only day/month visible use current year
- upi_handle is the UPI VPA if present (e.g. "merchant@okaxis"), otherwise null
- bank is the sender bank name (e.g. "HDFC", "ICICI", "Kotak")
- Return {"found": false} if this is not a transaction alert, or if amount/date cannot be determined, or if amount is 0`;

/**
 * Runs Gemini Flash structured extraction on a single email body.
 * Returns parsed transaction or {found: false} on any error.
 * Mirrors the pattern in gemini-statement-parse.ts.
 */
export async function runGeminiEmailParse(emailBody: string): Promise<EmailParseOutcome> {
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  try {
    const geminiPromise = genai.models
      .generateContent({
        model: 'gemini-2.5-flash',
        config: { thinkingConfig: { thinkingBudget: 0 } },
        contents: [
          {
            role: 'user',
            parts: [
              { text: PARSE_PROMPT },
              // Slice to 8K — bank alert emails are short; avoids padding cost
              { text: `Parse this email:\n\n${emailBody.slice(0, 8_000)}` },
            ],
          },
        ],
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
        return JSON.parse(json) as EmailParseOutcome;
      });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), TIMEOUT_MS)
    );

    return await Promise.race([geminiPromise, timeoutPromise]);
  } catch {
    // Any error (timeout, parse failure, API error) → treat as non-transaction email
    return { found: false };
  }
}
