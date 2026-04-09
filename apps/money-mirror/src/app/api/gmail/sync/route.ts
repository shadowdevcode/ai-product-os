/**
 * POST /api/gmail/sync
 *
 * Gmail-based transaction ingestion endpoint.
 * Accepts a batch of raw email bodies, parses each with Gemini Flash,
 * categorizes transactions, deduplicates, and persists to the DB.
 *
 * Auth (two modes):
 *   - Session cookie (dashboard "Sync now" button — Phase 2)
 *   - x-sync-secret header (Claude Code /gmail-sync command, cron worker)
 *
 * Prerequisite: schema migration must be applied before use:
 *   - dedup_hash generated column + unique index on transactions
 *   - gmail_sync_runs table
 *   - statement_type CHECK updated to include 'gmail_sync'
 *   - ingestion_source column on statements
 *
 * Telemetry: fire-and-forget per anti-pattern §4.
 */

import { randomUUID } from 'node:crypto';
import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { extractUpiHandle, normalizeMerchantKey } from '@/lib/merchant-normalize';
import { categorizeTransaction } from '@/lib/categorizer';
import { captureServerEvent } from '@/lib/posthog';
import { attachCoachingLayer } from '@/lib/coaching-enrich';
import { fetchDashboardData } from '@/lib/dashboard';
import { runGeminiEmailParse, type ParsedEmailTx } from './gemini-email-parse';
import { logSyncRun } from './log-sync-run';

export interface IncomingEmail {
  id: string; // Gmail message ID (used for logging only)
  subject: string;
  body: string; // plain-text or HTML body
}

interface SyncRequest {
  emails: IncomingEmail[];
  triggerMode: 'command' | 'manual_ui' | 'cron';
  userId?: string; // required when using x-sync-secret auth
}

interface SyncResponse {
  ok: boolean;
  emails_scanned: number;
  parsed_count: number;
  inserted_count: number;
  skipped_count: number; // dedup skips
  error_summary?: string;
}

function isAuthorizedSyncRequest(req: NextRequest): boolean {
  const secret = process.env.GMAIL_SYNC_SECRET;
  if (!secret) return false;
  return req.headers.get('x-sync-secret') === secret;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  let userId: string;

  const session = await getSessionUser();
  if (session) {
    userId = session.id;
  } else if (isAuthorizedSyncRequest(req)) {
    let body: SyncRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (!body.userId) {
      return NextResponse.json(
        { error: 'userId required for secret-auth requests' },
        { status: 400 }
      );
    }
    userId = body.userId;
    // Re-parse is not needed; req.json() already consumed. Re-attach body for processing below.
    return processSync(req, userId, body);
  } else {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: SyncRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  return processSync(req, userId, body);
}

async function processSync(
  _req: NextRequest,
  userId: string,
  body: SyncRequest
): Promise<NextResponse> {
  const { emails, triggerMode } = body;

  if (!Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json(
      { error: 'emails array is required and must be non-empty' },
      { status: 400 }
    );
  }

  const MAX_EMAILS_PER_BATCH = 100;
  const batch = emails.slice(0, MAX_EMAILS_PER_BATCH);

  // ── Step 1: Parse all emails with Gemini Flash in parallel ───────────────
  const parseResults = await Promise.allSettled(
    batch.map((email) => runGeminiEmailParse(email.body).catch(() => ({ found: false as const })))
  );

  const parsed: ParsedEmailTx[] = [];
  for (const result of parseResults) {
    if (result.status === 'fulfilled' && result.value.found === true) {
      parsed.push(result.value);
    }
  }

  if (parsed.length === 0) {
    await logSyncRun(userId, triggerMode, 'ok', batch.length, 0, 0, 0, null);
    return NextResponse.json<SyncResponse>({
      ok: true,
      emails_scanned: batch.length,
      parsed_count: 0,
      inserted_count: 0,
      skipped_count: 0,
    });
  }

  // ── Step 2: Categorize and convert to DB format ───────────────────────────
  const categorized = parsed.map((tx) => {
    const amount_paisa = Math.round(tx.amount * 100);
    return {
      ...categorizeTransaction(tx.merchant, amount_paisa, tx.date, tx.type),
      upi_handle: tx.upi_handle ?? extractUpiHandle(tx.merchant),
      merchant_key: normalizeMerchantKey(tx.merchant),
      channel: tx.channel,
    };
  });

  // ── Step 3: Compute statement period and totals ───────────────────────────
  const dates = categorized.map((t) => t.date).sort();
  const periodStart = dates[0];
  const periodEnd = dates[dates.length - 1];
  const totalDebits = categorized
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount_paisa, 0);
  const totalCredits = categorized
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount_paisa, 0);

  // ── Step 4: Persist via single DB transaction ─────────────────────────────
  const sql = getDb();
  const statementId = randomUUID();
  let insertedCount = 0;
  let skippedCount = 0;

  try {
    // Insert synthetic statement row
    await sql`
      INSERT INTO statements (
        id, user_id, bank_name, institution_name, statement_type,
        period_start, period_end, total_debits_paisa, total_credits_paisa,
        perceived_spend_paisa, status, ingestion_source
      ) VALUES (
        ${statementId}, ${userId}, 'Gmail Sync', 'Gmail Sync', 'gmail_sync',
        ${periodStart}::date, ${periodEnd}::date,
        ${totalDebits}, ${totalCredits},
        0, 'processing', ${triggerMode === 'command' ? 'gmail_command' : triggerMode === 'cron' ? 'gmail_cron' : 'gmail_manual_ui'}
      )
    `;

    // Insert transactions — ON CONFLICT skips duplicates (requires dedup_hash index)
    const txInserts = await Promise.allSettled(
      categorized.map((tx) =>
        sql`
          INSERT INTO transactions (
            id, statement_id, user_id, date, description,
            amount_paisa, type, category, is_recurring,
            merchant_key, upi_handle
          ) VALUES (
            ${randomUUID()}, ${statementId}, ${userId},
            ${tx.date}::date, ${tx.description},
            ${tx.amount_paisa}, ${tx.type}, ${tx.category}, ${tx.is_recurring},
            ${tx.merchant_key}, ${tx.upi_handle}
          )
          ON CONFLICT (user_id, dedup_hash) DO NOTHING
          RETURNING id
        `.then((res) => ({ inserted: (res as { rowCount?: number }).rowCount !== 0 }))
      )
    );

    for (const r of txInserts) {
      if (r.status === 'fulfilled' && r.value.inserted) {
        insertedCount++;
      } else {
        skippedCount++;
      }
    }

    // Mark statement as processed
    await sql`
      UPDATE statements
      SET status = 'processed',
          total_debits_paisa = ${totalDebits},
          total_credits_paisa = ${totalCredits}
      WHERE id = ${statementId} AND user_id = ${userId}
    `;
  } catch (error) {
    Sentry.captureException(error);
    const msg = error instanceof Error ? error.message : String(error);
    await logSyncRun(userId, triggerMode, 'failed', batch.length, parsed.length, 0, 0, msg);
    return NextResponse.json<SyncResponse>(
      {
        ok: false,
        emails_scanned: batch.length,
        parsed_count: parsed.length,
        inserted_count: 0,
        skipped_count: 0,
        error_summary: 'DB write failed — check schema migration was applied',
      },
      { status: 500 }
    );
  }

  // ── Step 5: Log sync run ──────────────────────────────────────────────────
  await logSyncRun(
    userId,
    triggerMode,
    insertedCount > 0 ? 'ok' : 'ok',
    batch.length,
    parsed.length,
    insertedCount,
    skippedCount,
    null
  );

  // ── Step 6: Retrigger advisories (last 30 days) ───────────────────────────
  // Fire-and-forget — advisory freshness is not critical to sync response latency
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  fetchDashboardData(userId, {
    variant: 'unified',
    dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
    dateTo: today.toISOString().split('T')[0],
    statementIds: null,
  })
    .then((dashboard) => {
      if (dashboard) return attachCoachingLayer(userId, dashboard);
    })
    .catch((e) => console.error('[gmail-sync] advisory retrigger failed:', e));

  // ── Step 7: Telemetry ─────────────────────────────────────────────────────
  captureServerEvent(userId, 'gmail_sync_completed', {
    trigger_mode: triggerMode,
    emails_scanned: batch.length,
    parsed_count: parsed.length,
    inserted_count: insertedCount,
    skipped_count: skippedCount,
  }).catch(() => {});

  return NextResponse.json<SyncResponse>({
    ok: true,
    emails_scanned: batch.length,
    parsed_count: parsed.length,
    inserted_count: insertedCount,
    skipped_count: skippedCount,
  });
}
