/**
 * POST /api/cron/gmail-sync/worker
 *
 * Per-user Gmail sync worker. Called by /api/cron/gmail-sync (fan-out).
 *
 * Flow:
 *   1. Get user's OAuth token (auto-refresh if near expiry)
 *   2. Fetch last 2 days of transaction emails from Gmail
 *   3. Run shared Gmail sync pipeline (parse + DB write + advisories)
 *   4. Mark last_sync_at and fire telemetry
 *
 * Skips gracefully if no valid token (revoked / refresh failed).
 * Auth: x-cron-secret header (internal only).
 *
 * Telemetry:
 *   - gmail_cron_worker_skipped  (no valid token)
 *   - gmail_cron_worker_failed   (Gmail API error)
 *   - gmail_cron_worker_completed (success)
 */

import { NextRequest, NextResponse } from 'next/server';
import { markGmailSyncAt } from '@/lib/db-oauth';
import { getValidAccessToken, fetchGmailTransactionEmails } from '@/lib/gmail-oauth';
import { captureServerEvent } from '@/lib/posthog';
import { runGmailSync } from '@/lib/gmail/run-sync';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const cronSecret = req.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const { userId } = body as { userId: string };

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    captureServerEvent(userId, 'gmail_cron_worker_skipped', { reason: 'no_valid_token' }).catch(
      () => {}
    );
    return NextResponse.json({ ok: true, skipped: true, reason: 'no_valid_token' });
  }

  let emails: Awaited<ReturnType<typeof fetchGmailTransactionEmails>>;
  try {
    emails = await fetchGmailTransactionEmails(accessToken, 2, 100);
  } catch (e) {
    console.error(`[gmail-sync/worker] Gmail fetch failed for ${userId}:`, e);
    captureServerEvent(userId, 'gmail_cron_worker_failed', {
      reason: 'gmail_fetch_failed',
      error: e instanceof Error ? e.message : 'unknown',
    }).catch(() => {});
    return NextResponse.json({ ok: false, error: 'gmail_fetch_failed' }, { status: 502 });
  }

  if (emails.length === 0) {
    await markGmailSyncAt(userId).catch(() => {});
    return NextResponse.json({
      ok: true,
      emails_scanned: 0,
      parsed_count: 0,
      inserted_count: 0,
      skipped_count: 0,
    });
  }

  const syncRes = await runGmailSync(userId, {
    emails,
    triggerMode: 'cron',
  });

  const data = (await syncRes.json().catch(() => ({}))) as {
    emails_scanned?: number;
    parsed_count?: number;
    inserted_count?: number;
    skipped_count?: number;
  };

  await markGmailSyncAt(userId).catch(() => {});

  captureServerEvent(userId, 'gmail_cron_worker_completed', {
    emails_scanned: data.emails_scanned ?? emails.length,
    parsed_count: data.parsed_count ?? 0,
    inserted_count: data.inserted_count ?? 0,
    skipped_count: data.skipped_count ?? 0,
  }).catch(() => {});

  return NextResponse.json({ ok: syncRes.ok, ...data }, { status: syncRes.status });
}
