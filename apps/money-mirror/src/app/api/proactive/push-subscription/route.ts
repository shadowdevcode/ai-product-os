import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { captureServerEvent } from '@/lib/posthog';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    endpoint?: string;
    user_agent?: string;
  } | null;
  const endpoint = body?.endpoint?.trim() ?? '';
  if (!endpoint) {
    return NextResponse.json({ error: 'endpoint is required.' }, { status: 400 });
  }

  // Single emission source: server-side in /api/proactive/push-subscription
  captureServerEvent(user.id, 'push_subscription_granted', {
    endpoint_hash: endpoint.slice(-24),
    user_agent: body?.user_agent?.slice(0, 120) ?? null,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
