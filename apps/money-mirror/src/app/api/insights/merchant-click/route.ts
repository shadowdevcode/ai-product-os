/**
 * POST /api/insights/merchant-click
 * Single emission source for `merchant_rollup_clicked` (server-side).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { captureServerEvent } from '@/lib/posthog';

function bucketKey(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (s.length <= 2) {
    return 'short';
  }
  const head = s.slice(0, 8);
  return head.replace(/[^a-z0-9]/g, '_');
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { merchant_key?: string };
  try {
    body = (await req.json()) as { merchant_key?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const key = typeof body.merchant_key === 'string' ? body.merchant_key.trim() : '';
  if (!key || key.length > 128) {
    return NextResponse.json({ error: 'merchant_key required' }, { status: 400 });
  }

  void captureServerEvent(user.id, 'merchant_rollup_clicked', {
    merchant_key_bucket: bucketKey(key),
    key_length: key.length,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
