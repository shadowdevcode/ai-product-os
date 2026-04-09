/**
 * POST /api/gmail/trigger-sync
 *
 * Manual "Sync now" endpoint called from the dashboard SyncPanel.
 * Uses the session user's stored Gmail OAuth token to fetch transaction
 * emails, then delegates to /api/gmail/sync for parsing + persistence.
 *
 * Auth: session cookie only (no secret header).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { markGmailSyncAt } from '@/lib/db-oauth';
import { getValidAccessToken, fetchGmailTransactionEmails } from '@/lib/gmail-oauth';

export async function POST(_req: NextRequest): Promise<NextResponse> {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get a valid OAuth access token (auto-refreshes if near expiry)
  const accessToken = await getValidAccessToken(session.id);
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Gmail not connected or token expired. Please reconnect Gmail.' },
      { status: 402 }
    );
  }

  // Fetch last 30 days of transaction emails (broad window; dedup handles overlap)
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

  // Delegate to the existing sync endpoint (handles Gemini parse + DB write + advisories)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const syncRes = await fetch(`${appUrl}/api/gmail/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sync-secret': process.env.GMAIL_SYNC_SECRET!,
    },
    body: JSON.stringify({
      emails,
      triggerMode: 'manual_ui',
      userId: session.id,
    }),
  });

  const data = (await syncRes.json().catch(() => ({}))) as Record<string, unknown>;

  // Mark last sync time regardless of sync outcome
  await markGmailSyncAt(session.id).catch((e) =>
    console.error('[trigger-sync] markGmailSyncAt failed:', e)
  );

  return NextResponse.json(data, { status: syncRes.status });
}
