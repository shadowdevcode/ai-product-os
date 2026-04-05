/**
 * POST /api/transactions/view-opened
 *
 * Single emission source for `transactions_view_opened` (server-side PostHog).
 * Client should call once per session when the Transactions surface is shown (sessionStorage guard).
 */

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { ensureProfile } from '@/lib/db';
import { captureServerEvent } from '@/lib/posthog';

export async function POST(): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureProfile({ id: user.id, email: user.email });
  } catch {
    return NextResponse.json({ error: 'Failed to ensure profile' }, { status: 500 });
  }

  void captureServerEvent(user.id, 'transactions_view_opened', {
    surface: 'dashboard_transactions',
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
