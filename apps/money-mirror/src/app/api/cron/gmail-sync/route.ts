/**
 * GET /api/cron/gmail-sync
 *
 * Daily fan-out cron: fetches all users with active Gmail tokens
 * and triggers the per-user worker for each. Mirrors the weekly-recap pattern.
 *
 * Auth: x-cron-secret header (Vercel cron / internal only).
 * Schedule: 30 1 * * * (01:30 UTC = 07:00 IST)
 *
 * Telemetry: gmail_cron_run_completed (fire-and-forget)
 */

import { NextRequest, NextResponse } from 'next/server';
import { listUsersWithGmailTokens } from '@/lib/db-oauth';
import { captureServerEvent } from '@/lib/posthog';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = req.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userIds = await listUsersWithGmailTokens();

  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, triggered: 0 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const workerUrl = `${appUrl}/api/cron/gmail-sync/worker`;

  const results = await Promise.allSettled(
    userIds.map((userId) =>
      fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': process.env.CRON_SECRET!,
        },
        body: JSON.stringify({ userId }),
      })
    )
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.length - succeeded;

  captureServerEvent('system', 'gmail_cron_run_completed', {
    user_count: userIds.length,
    succeeded,
    failed,
  }).catch(() => {});

  return NextResponse.json({ ok: true, triggered: userIds.length, succeeded, failed });
}
