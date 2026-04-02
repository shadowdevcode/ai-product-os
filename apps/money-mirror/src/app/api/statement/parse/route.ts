/**
 * POST /api/statement/parse
 *
 * Accepts a multipart/form-data PDF upload, extracts transactions
 * using Gemini Flash, categorizes them, and saves to the database.
 *
 * Privacy: The PDF is processed entirely in-memory (Option A).
 * The buffer reference is explicitly nulled after text extraction.
 * (T7 — Zero-retention delete)
 *
 * Rate limit: 3 uploads per user per day (enforced via DB count).
 *
 * Auth: Requires an authenticated Neon Auth session cookie.
 *
 * Telemetry (PostHog) — Single emission source: server-side here.
 * Events fired:
 *   - statement_parse_started
 *   - statement_parse_rate_limited
 *   - statement_parse_success
 *   - statement_parse_timeout
 *   - statement_parse_failed
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSessionUser } from '@/lib/auth/session';
import { countUserStatementsSince, ensureProfile } from '@/lib/db';
import { extractPdfText, PdfExtractionError } from '@/lib/pdf-parser';
import { categorizeTransaction, summarizeByCategory } from '@/lib/categorizer';
import { captureServerEvent } from '@/lib/posthog';
import { persistStatement } from './persist-statement';

const TIMEOUT_MS = 9_000;
const MAX_UPLOADS_PER_DAY = 3;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ─── Gemini schema for structured output ─────────────────────────────────

const GEMINI_SYSTEM_PROMPT = `You are a bank statement parser for HDFC Bank India.
Extract every debit and credit transaction from the text.
Return ONLY valid JSON — no markdown, no explanation.
All amounts must be in rupees as a decimal number (e.g. 500.00 for ₹500).
Dates must be formatted as YYYY-MM-DD.
For the description, use the normalized merchant name only (e.g. "SWIGGY" not "SWIGGY ORDER #12345").`;

interface GeminiTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
}

interface GeminiResponse {
  transactions: GeminiTransaction[];
  period_start: string;
  period_end: string;
}

// ─── Route Handler ────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;
  await ensureProfile({ id: user.id, email: user.email });

  // ── 2. Rate limiting: max 3 uploads/day ──────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const count = await countUserStatementsSince(userId, `${today}T00:00:00Z`);

  if ((count ?? 0) >= MAX_UPLOADS_PER_DAY) {
    // Single emission source: server-side
    await captureServerEvent(userId, 'statement_parse_rate_limited', {
      uploads_today: count,
      limit: MAX_UPLOADS_PER_DAY,
    });
    return NextResponse.json(
      {
        error: 'Upload limit reached',
        detail: `You can upload up to ${MAX_UPLOADS_PER_DAY} statements per day.`,
      },
      { status: 429 }
    );
  }

  // ── 3. Parse multipart form ───────────────────────────────────────
  let fileBuffer: Buffer | null = null;
  let fileName = 'statement.pdf';

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10 MB.' },
        { status: 400 }
      );
    }

    // Check MIME type (basic check — content-type from browser)
    const mimeType = file.type;
    if (mimeType && mimeType !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted.' }, { status: 400 });
    }

    fileName = file.name ?? fileName;
    const arrayBuffer = await file.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);
  } catch {
    return NextResponse.json({ error: 'Failed to read uploaded file.' }, { status: 400 });
  }

  // ── 4. Extract PDF text ───────────────────────────────────────────
  let pdfText: string;

  try {
    const extracted = await extractPdfText(fileBuffer);
    pdfText = extracted.text;
  } catch (err) {
    // T7 — Null buffer immediately after use (zero-retention)
    fileBuffer = null;

    const code = err instanceof PdfExtractionError ? err.code : 'PARSE_FAILED';
    await captureServerEvent(userId, 'statement_parse_failed', {
      error_type: code,
      file_name: fileName,
    });
    return NextResponse.json(
      {
        error:
          code === 'EMPTY_TEXT'
            ? 'This PDF appears to be a scanned image. Please upload a digitally generated bank statement.'
            : 'Failed to read the PDF. Please ensure it is a valid bank statement.',
      },
      { status: 422 }
    );
  }

  // T7 — Null the buffer immediately after text extraction
  fileBuffer = null;

  // ── 5. Emit telemetry: parse started ─────────────────────────────
  await captureServerEvent(userId, 'statement_parse_started', {
    pdf_text_length: pdfText.length,
  });

  // ── 6. Gemini extraction with timeout ────────────────────────────
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  let geminiData: GeminiResponse;

  try {
    const geminiPromise = genai.models
      .generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: GEMINI_SYSTEM_PROMPT },
              {
                text: `Parse this bank statement and return JSON:\n\n${pdfText.slice(0, 30_000)}`,
              },
            ],
          },
        ],
      })
      .then((res) => {
        const raw = res.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        // Strip markdown code fences if present
        const json = raw
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        return JSON.parse(json) as GeminiResponse;
      });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), TIMEOUT_MS)
    );

    geminiData = await Promise.race([geminiPromise, timeoutPromise]);
  } catch (err) {
    const isTimeout = err instanceof Error && err.message === 'GEMINI_TIMEOUT';

    if (isTimeout) {
      await captureServerEvent(userId, 'statement_parse_timeout', {
        timeout_ms: TIMEOUT_MS,
      });
      return NextResponse.json(
        { error: 'Processing took too long. Please try again.' },
        { status: 504 }
      );
    }

    await captureServerEvent(userId, 'statement_parse_failed', {
      error_type: 'GEMINI_ERROR',
    });
    return NextResponse.json(
      { error: 'Failed to extract transactions from the PDF.' },
      { status: 500 }
    );
  }

  // ── 7. Categorize transactions ────────────────────────────────────
  const categorized = geminiData.transactions.map((tx) =>
    categorizeTransaction(
      tx.description,
      Math.round(tx.amount * 100), // rupees → paisa
      tx.date,
      tx.type
    )
  );

  const summary = summarizeByCategory(categorized);

  // ── 8. Persist to database ────────────────────────────────────────
  const { statement_id, error: persistError } = await persistStatement(
    userId,
    categorized,
    summary,
    { period_start: geminiData.period_start, period_end: geminiData.period_end }
  );

  if (persistError) {
    return NextResponse.json({ error: persistError }, { status: 500 });
  }

  // ── 9. Success telemetry — single emission source ─────────────────
  const latencyMs = Date.now() - startTime;

  await captureServerEvent(userId, 'statement_parse_success', {
    latency_ms: latencyMs,
    transaction_count: categorized.length,
    period_start: geminiData.period_start,
    period_end: geminiData.period_end,
    total_debits_paisa: summary.total_debits,
    needs_pct:
      summary.total_debits > 0 ? Math.round((summary.needs / summary.total_debits) * 100) : 0,
    wants_pct:
      summary.total_debits > 0 ? Math.round((summary.wants / summary.total_debits) * 100) : 0,
    investment_pct:
      summary.total_debits > 0 ? Math.round((summary.investment / summary.total_debits) * 100) : 0,
  });

  return NextResponse.json({
    statement_id,
    period_start: geminiData.period_start,
    period_end: geminiData.period_end,
    transaction_count: categorized.length,
    summary: {
      needs_paisa: summary.needs,
      wants_paisa: summary.wants,
      investment_paisa: summary.investment,
      debt_paisa: summary.debt,
      other_paisa: summary.other,
      total_debits_paisa: summary.total_debits,
      total_credits_paisa: summary.total_credits,
    },
  });
}
