/**
 * POST /api/dashboard/scope-changed
 *
 * Single emission source for `scope_changed` (server-side PostHog).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { ensureProfile } from '@/lib/db';
import { captureServerEvent } from '@/lib/posthog';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { date_preset?: string | null; source_count?: number };
  try {
    body = (await req.json()) as { date_preset?: string | null; source_count?: number };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const datePreset =
    body.date_preset === null || body.date_preset === undefined
      ? null
      : String(body.date_preset).slice(0, 64);
  const sourceCount = Number.isFinite(body.source_count)
    ? Math.max(0, Math.min(500, Math.floor(body.source_count as number)))
    : 0;

  try {
    await ensureProfile({ id: user.id, email: user.email });
    void captureServerEvent(user.id, 'scope_changed', {
      date_preset: datePreset,
      source_count: sourceCount,
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
