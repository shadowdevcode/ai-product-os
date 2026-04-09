/**
 * GET /api/gmail/sync/status
 *
 * Returns the last 5 sync runs + Gmail connection status for the current user.
 * Used by the dashboard SyncPanel to show history and connection state.
 */

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { getOAuthTokenRow } from '@/lib/db-oauth';

export async function GET(): Promise<NextResponse> {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = getDb();

  const runs = (await sql`
    SELECT trigger_mode, status, emails_scanned, parsed_count,
           inserted_count, skipped_count, error_summary, created_at
    FROM gmail_sync_runs
    WHERE user_id = ${session.id}
    ORDER BY created_at DESC
    LIMIT 5
  `) as {
    trigger_mode: string;
    status: string;
    emails_scanned: number;
    parsed_count: number;
    inserted_count: number;
    skipped_count: number;
    error_summary: string | null;
    created_at: string;
  }[];

  const tokenRow = await getOAuthTokenRow(session.id, 'google');

  return NextResponse.json({
    runs,
    has_token: tokenRow !== null && tokenRow.status === 'active',
    token_status: tokenRow?.status ?? null,
    last_sync_at: tokenRow?.last_sync_at ?? null,
  });
}
