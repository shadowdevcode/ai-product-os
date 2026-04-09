/**
 * POST /api/gmail/sync
 *
 * Gmail-based transaction ingestion endpoint.
 * Accepts a batch of raw email bodies, parses each with Gemini Flash,
 * categorizes transactions, deduplicates, and persists to the DB.
 *
 * Auth (two modes):
 *   - Session cookie (direct POST with browser session)
 *   - x-sync-secret header (Claude Code /gmail-sync command, external callers)
 *
 * Core logic: @/lib/gmail/run-sync (also used by trigger-sync and cron worker).
 *
 * Prerequisite: schema migration must be applied before use:
 *   - dedup_hash generated column + unique index on transactions
 *   - gmail_sync_runs table
 *   - statement_type CHECK updated to include 'gmail_sync'
 *   - ingestion_source column on statements
 *
 * Telemetry: fire-and-forget per anti-pattern §4.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { runGmailSync, type GmailSyncRequestBody, type IncomingEmail } from '@/lib/gmail/run-sync';

export type { IncomingEmail };

function isAuthorizedSyncRequest(req: NextRequest): boolean {
  const secret = process.env.GMAIL_SYNC_SECRET;
  if (!secret) return false;
  return req.headers.get('x-sync-secret') === secret;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let userId: string;

  const session = await getSessionUser();
  if (session) {
    userId = session.id;
  } else if (isAuthorizedSyncRequest(req)) {
    let body: GmailSyncRequestBody;
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
    return runGmailSync(userId, body);
  } else {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: GmailSyncRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  return runGmailSync(userId, body);
}
