/**
 * POST /api/cron/weekly-recap/worker
 *
 * Per-user weekly recap email worker.
 * Called by /api/cron/weekly-recap (fan-out master).
 *
 * Fetches the user's most recent processed statement, builds a
 * summary, and sends the recap email via Resend.
 *
 * Auth: Requires `x-cron-secret` header (internal only).
 *
 * PostHog telemetry:
 *   - weekly_recap_email_sent   (success)
 *   - weekly_recap_email_failed (failure — non-fatal, logged only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
  getLatestProcessedStatementForUser,
  getProfileEmail,
  getTopCategoryTotalsForStatement,
} from '@/lib/db';
import { captureServerEvent } from '@/lib/posthog';

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────
  const cronSecret = req.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const { userId } = body as { userId: string };
  const resend = new Resend(process.env.RESEND_API_KEY!);

  // ── Fetch most recent processed statement ─────────────────────────
  const email = await getProfileEmail(userId);
  if (!email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const statement = await getLatestProcessedStatementForUser(userId);
  if (!statement) {
    // No statement yet — skip silently, not an error
    return NextResponse.json({ ok: true, skipped: true });
  }

  // ── Fetch top spending categories ─────────────────────────────────
  const categoryTotals: Record<string, number> = {};
  const topCategories = await getTopCategoryTotalsForStatement(statement.id, userId, 5);

  for (const tx of topCategories) {
    categoryTotals[tx.category] = (categoryTotals[tx.category] ?? 0) + tx.amount_paisa;
  }
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  const totalSpent = Math.round(statement.total_debits_paisa / 100).toLocaleString('en-IN');
  const periodLabel = statement.period_start
    ? `${statement.period_start} → ${statement.period_end}`
    : 'last month';
  const topCatLabel = topCategory
    ? `${topCategory[0]} (₹${Math.round(topCategory[1] / 100).toLocaleString('en-IN')})`
    : '—';

  // ── Send email via Resend ─────────────────────────────────────────
  try {
    await resend.emails.send({
      from: 'MoneyMirror <recap@moneymirror.in>',
      to: email,
      subject: `Your MoneyMirror weekly recap 🪞`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#080c10;color:#e8eaf6;border-radius:12px;">
          <h1 style="font-size:1.4rem;font-weight:800;color:#6c63ff;margin:0 0 8px;">MoneyMirror Weekly Recap</h1>
          <p style="color:#9ba3b2;font-size:0.85rem;margin:0 0 24px;">${periodLabel}</p>

          <div style="background:#131820;border-radius:10px;padding:16px;margin-bottom:16px;">
            <div style="font-size:0.75rem;color:#9ba3b2;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Total Spent</div>
            <div style="font-size:1.8rem;font-weight:800;color:#ef5350;">₹${totalSpent}</div>
          </div>

          <div style="background:#131820;border-radius:10px;padding:16px;margin-bottom:16px;">
            <div style="font-size:0.75rem;color:#9ba3b2;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Biggest Category</div>
            <div style="font-size:1rem;font-weight:600;color:#e8eaf6;">${topCatLabel}</div>
          </div>

          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://moneymirror.in'}/dashboard"
             style="display:block;background:#6c63ff;color:#fff;text-align:center;padding:14px;border-radius:10px;font-weight:700;text-decoration:none;margin-top:24px;">
            See Your Full Mirror →
          </a>

          <p style="color:#4a5568;font-size:0.72rem;text-align:center;margin-top:20px;">
            Your data is private and never shared. <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://moneymirror.in'}/unsubscribe" style="color:#6c63ff;">Unsubscribe</a>
          </p>
        </div>
      `,
    });

    await captureServerEvent(userId, 'weekly_recap_email_sent', {
      period_start: statement.period_start,
      period_end: statement.period_end,
      total_debits_paisa: statement.total_debits_paisa,
    }).catch((e) => console.error('[worker] posthog sent failed:', e));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[worker] resend failed for ${userId}:`, err);

    await captureServerEvent(userId, 'weekly_recap_email_failed', {
      error: err instanceof Error ? err.message : 'unknown',
    }).catch((e) => console.error('[worker] posthog failed failed:', e));

    return NextResponse.json({ ok: false, error: 'email send failed' }, { status: 502 });
  }
}
