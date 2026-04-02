/**
 * POST /api/cron/weekly-recap
 *
 * T11 — Weekly Recap Email (Fan-Out Pattern)
 *
 * Triggered by Vercel Cron every Monday at 8:00 AM IST.
 * Fetches all users who have uploaded at least one statement,
 * then fans out individual recap emails via Resend.
 *
 * Auth: Requires `x-cron-secret` header matching CRON_SECRET env var.
 *
 * Fan-out architecture (engineering lesson §2):
 *   - Master route: fetches user list, triggers per-user worker calls
 *   - Worker: /api/cron/weekly-recap/worker (handles single user email)
 *
 * PostHog telemetry — single emission source: server-side here.
 * Events fired:
 *   - weekly_recap_triggered  (master cron run)
 *   - weekly_recap_completed  (after Promise.allSettled)
 */

import { NextRequest, NextResponse } from 'next/server';
import { listEligibleWeeklyRecapUsers } from '@/lib/db';
import { captureServerEvent } from '@/lib/posthog';

const STATEMENT_BATCH_SIZE = 1000;

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth: Verify CRON_SECRET ──────────────────────────────────────
  const cronSecret = req.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const uniqueUserIds = new Set<string>();
  let offset = 0;

  while (true) {
    let users: string[];
    try {
      users = await listEligibleWeeklyRecapUsers(STATEMENT_BATCH_SIZE, offset);
    } catch (error) {
      console.error('[weekly-recap] failed to fetch users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    for (const userId of users) {
      uniqueUserIds.add(userId);
    }

    if (users.length < STATEMENT_BATCH_SIZE) {
      break;
    }

    offset += STATEMENT_BATCH_SIZE;
  }
  const eligibleUserIds = [...uniqueUserIds];

  await captureServerEvent('system', 'weekly_recap_triggered', {
    user_count: eligibleUserIds.length,
  }).catch((e) => console.error('[weekly-recap] posthog triggered failed:', e));

  // ── Fan-out: trigger per-user worker ─────────────────────────────
  const workerUrl = new URL('/api/cron/weekly-recap/worker', req.url).toString();

  const results = await Promise.allSettled(
    eligibleUserIds.map((userId) =>
      fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': process.env.CRON_SECRET!,
        },
        body: JSON.stringify({ userId }),
      }).then(async (res) => {
        if (!res.ok) {
          throw new Error(`worker returned ${res.status}`);
        }

        const body = await res.json().catch(() => null);
        if (!body?.ok) {
          throw new Error('worker returned unsuccessful result');
        }
      })
    )
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  await captureServerEvent('system', 'weekly_recap_completed', {
    total: eligibleUserIds.length,
    succeeded,
    failed,
  }).catch((e) => console.error('[weekly-recap] posthog completed failed:', e));

  return NextResponse.json({ ok: true, total: eligibleUserIds.length, succeeded, failed });
}
