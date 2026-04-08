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
import { getSessionUser } from '@/lib/auth/session';
import { countUserStatementsSince, ensureProfile, getDb } from '@/lib/db';
import { normalizeUserPlan } from '@/lib/user-plan';
import { extractPdfText, PdfExtractionError } from '@/lib/pdf-parser';
import {
  categorizeCreditCardTransaction,
  categorizeTransaction,
  summarizeByCategory,
} from '@/lib/categorizer';
import { captureServerEvent } from '@/lib/posthog';
import { parseStatementType } from '@/lib/statements';
import { parseAccountPurpose, sanitizeCardNetwork, sanitizeNickname } from '@/lib/upload-metadata';
import { runGeminiStatementParse, TIMEOUT_MS } from './gemini-statement-parse';
import { persistStatement } from './persist-statement';
const MAX_UPLOADS_PER_DAY = 3;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ─── Gemini schema for structured output ─────────────────────────────────

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
    // Single emission source: server-side — fire-and-forget, must not block response
    captureServerEvent(userId, 'statement_parse_rate_limited', {
      uploads_today: count,
      limit: MAX_UPLOADS_PER_DAY,
    }).catch(() => {});
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
  let statementType = parseStatementType(null);
  let nickname: string | null = null;
  let accountPurpose = null as ReturnType<typeof parseAccountPurpose>;
  let cardNetwork: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    statementType = parseStatementType(formData.get('statement_type'));
    nickname = sanitizeNickname(formData.get('nickname'));
    accountPurpose = parseAccountPurpose(formData.get('account_purpose'));
    cardNetwork =
      statementType === 'credit_card' ? sanitizeCardNetwork(formData.get('card_network')) : null;

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
    captureServerEvent(userId, 'statement_parse_failed', {
      error_type: code,
      file_name: fileName,
    }).catch(() => {});
    const errorMessage =
      code === 'EMPTY_TEXT'
        ? 'This PDF appears to be a scanned image. Please upload a digitally generated bank statement.'
        : code === 'PASSWORD_PROTECTED'
          ? 'Your PDF is password-protected. Please remove the password and re-upload.'
          : 'Failed to read the PDF. Please ensure it is a valid bank statement.';
    return NextResponse.json({ error: errorMessage }, { status: 422 });
  }

  // T7 — Null the buffer immediately after text extraction
  fileBuffer = null;

  // ── 5. Emit telemetry: parse started — fire-and-forget ───────────
  captureServerEvent(userId, 'statement_parse_started', {
    pdf_text_length: pdfText.length,
  }).catch(() => {});

  // ── 6. Gemini extraction with timeout ────────────────────────────
  const geminiOutcome = await runGeminiStatementParse(pdfText, statementType);

  if (!geminiOutcome.ok) {
    if (geminiOutcome.code === 'timeout') {
      captureServerEvent(userId, 'statement_parse_timeout', {
        timeout_ms: TIMEOUT_MS,
      }).catch(() => {});
      return NextResponse.json(
        { error: 'Processing took too long. Please try again.' },
        { status: 504 }
      );
    }
    captureServerEvent(userId, 'statement_parse_failed', {
      error_type: 'GEMINI_ERROR',
      detail: (geminiOutcome.detail ?? '').slice(0, 200),
    }).catch(() => {});
    return NextResponse.json(
      { error: 'Failed to extract transactions from the PDF.' },
      { status: 500 }
    );
  }

  const parsedStatement = geminiOutcome.data;

  // ── 7. Categorize transactions ────────────────────────────────────
  const categorized = parsedStatement.transactions.map((tx) => {
    const amountPaisa = Math.round(tx.amount * 100);

    if (statementType === 'credit_card') {
      return categorizeCreditCardTransaction(
        tx.description,
        amountPaisa,
        tx.date,
        tx.entry_kind ?? 'other'
      );
    }

    return categorizeTransaction(tx.description, amountPaisa, tx.date, tx.type);
  });

  const summary = summarizeByCategory(categorized);

  // ── 8. Persist to database ────────────────────────────────────────
  const { statement_id, error: persistError } = await persistStatement(
    userId,
    categorized,
    summary,
    {
      institution_name: parsedStatement.institution_name,
      statement_type: parsedStatement.statement_type,
      period_start: parsedStatement.period_start,
      period_end: parsedStatement.period_end,
      due_date: parsedStatement.due_date,
      payment_due_paisa: parsedStatement.payment_due_paisa,
      minimum_due_paisa: parsedStatement.minimum_due_paisa,
      credit_limit_paisa: parsedStatement.credit_limit_paisa,
      nickname,
      account_purpose: accountPurpose,
      card_network: cardNetwork,
    }
  );

  if (persistError) {
    return NextResponse.json({ error: persistError }, { status: 500 });
  }

  // ── 9. Success telemetry — single emission source, fire-and-forget ──
  const latencyMs = Date.now() - startTime;

  captureServerEvent(userId, 'statement_parse_success', {
    latency_ms: latencyMs,
    transaction_count: categorized.length,
    period_start: parsedStatement.period_start,
    period_end: parsedStatement.period_end,
    institution_name: parsedStatement.institution_name,
    statement_type: parsedStatement.statement_type,
    total_debits_paisa: summary.total_debits,
    needs_pct:
      summary.total_debits > 0 ? Math.round((summary.needs / summary.total_debits) * 100) : 0,
    wants_pct:
      summary.total_debits > 0 ? Math.round((summary.wants / summary.total_debits) * 100) : 0,
    investment_pct:
      summary.total_debits > 0 ? Math.round((summary.investment / summary.total_debits) * 100) : 0,
  }).catch(() => {});

  const sql = getDb();
  const planRows = (await sql`
    SELECT plan FROM profiles WHERE id = ${userId} LIMIT 1
  `) as { plan: string | null }[];

  return NextResponse.json({
    statement_id,
    plan: normalizeUserPlan(planRows[0]?.plan),
    institution_name: parsedStatement.institution_name,
    statement_type: parsedStatement.statement_type,
    period_start: parsedStatement.period_start,
    period_end: parsedStatement.period_end,
    due_date: parsedStatement.due_date,
    payment_due_paisa: parsedStatement.payment_due_paisa,
    minimum_due_paisa: parsedStatement.minimum_due_paisa,
    credit_limit_paisa: parsedStatement.credit_limit_paisa,
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
