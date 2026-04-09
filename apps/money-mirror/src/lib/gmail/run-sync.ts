/**
 * Shared Gmail batch → DB pipeline (parse, categorize, dedupe, persist).
 * Used by POST /api/gmail/sync, dashboard trigger-sync, and cron worker.
 */

import { randomUUID } from 'node:crypto';
import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { extractUpiHandle, normalizeMerchantKey } from '@/lib/merchant-normalize';
import { categorizeTransaction } from '@/lib/categorizer';
import { captureServerEvent } from '@/lib/posthog';
import { attachCoachingLayer } from '@/lib/coaching-enrich';
import { fetchDashboardData } from '@/lib/dashboard';
import { runGeminiEmailParse, type ParsedEmailTx } from '@/lib/gmail/gemini-email-parse';
import { logSyncRun } from '@/lib/gmail/log-sync-run';

export interface IncomingEmail {
  id: string; // Gmail message ID (used for logging only)
  subject: string;
  body: string; // plain-text or HTML body
}

export interface GmailSyncRequestBody {
  emails: IncomingEmail[];
  triggerMode: 'command' | 'manual_ui' | 'cron';
  userId?: string; // required when using x-sync-secret auth (HTTP only)
}

export interface GmailSyncResponse {
  ok: boolean;
  emails_scanned: number;
  parsed_count: number;
  inserted_count: number;
  skipped_count: number; // dedup skips
  error_summary?: string;
}

/**
 * Run the full Gmail sync pipeline for a known user (no HTTP/session inside).
 */
export async function runGmailSync(
  userId: string,
  body: GmailSyncRequestBody
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
    return NextResponse.json<GmailSyncResponse>({
      ok: true,
      emails_scanned: batch.length,
      parsed_count: 0,
      inserted_count: 0,
      skipped_count: 0,
    });
  }

  const categorized = parsed.map((tx) => {
    const amount_paisa = Math.round(tx.amount * 100);
    return {
      ...categorizeTransaction(tx.merchant, amount_paisa, tx.date, tx.type),
      upi_handle: tx.upi_handle ?? extractUpiHandle(tx.merchant),
      merchant_key: normalizeMerchantKey(tx.merchant),
      channel: tx.channel,
    };
  });

  const dates = categorized.map((t) => t.date).sort();
  const periodStart = dates[0];
  const periodEnd = dates[dates.length - 1];
  const totalDebits = categorized
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount_paisa, 0);
  const totalCredits = categorized
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount_paisa, 0);

  const sql = getDb();
  const statementId = randomUUID();
  let insertedCount = 0;
  let skippedCount = 0;

  try {
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
    return NextResponse.json<GmailSyncResponse>(
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

  captureServerEvent(userId, 'gmail_sync_completed', {
    trigger_mode: triggerMode,
    emails_scanned: batch.length,
    parsed_count: parsed.length,
    inserted_count: insertedCount,
    skipped_count: skippedCount,
  }).catch(() => {});

  return NextResponse.json<GmailSyncResponse>({
    ok: true,
    emails_scanned: batch.length,
    parsed_count: parsed.length,
    inserted_count: insertedCount,
    skipped_count: skippedCount,
  });
}
