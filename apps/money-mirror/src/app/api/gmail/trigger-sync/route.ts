/**
 * POST /api/gmail/trigger-sync
 *
 * Manual "Sync now" endpoint called from the dashboard SyncPanel.
 * Uses the session user's stored Gmail OAuth token to fetch transaction
 * emails, then runs the shared Gmail sync pipeline (no HTTP loopback).
 *
 * Auth: session cookie only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { markGmailSyncAt } from '@/lib/db-oauth';
import { getValidAccessToken, fetchGmailTransactionEmails } from '@/lib/gmail-oauth';
import { runGmailSync } from '@/lib/gmail/run-sync';

export async function POST(_req: NextRequest): Promise<NextResponse> {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accessToken = await getValidAccessToken(session.id);
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Gmail not connected or token expired. Please reconnect Gmail.' },
      { status: 402 }
    );
  }

  let emails: Awaited<ReturnType<typeof fetchGmailTransactionEmails>>;
  try {
    emails = await fetchGmailTransactionEmails(accessToken, 30, 100);
  } catch (e) {
    console.error('[trigger-sync] Gmail fetch failed:', e);
    return NextResponse.json({ error: 'Failed to fetch Gmail messages' }, { status: 502 });
  }

  if (emails.length === 0) {
    return NextResponse.json({
      ok: true,
      emails_scanned: 0,
      parsed_count: 0,
      inserted_count: 0,
      skipped_count: 0,
    });
  }

  const res = await runGmailSync(session.id, {
    emails,
    triggerMode: 'manual_ui',
  });

  await markGmailSyncAt(session.id).catch((e) =>
    console.error('[trigger-sync] markGmailSyncAt failed:', e)
  );

  return res;
}
