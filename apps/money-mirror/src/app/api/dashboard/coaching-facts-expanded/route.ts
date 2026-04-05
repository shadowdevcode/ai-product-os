import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { captureServerEvent } from '@/lib/posthog';

/**
 * POST — fires when user expands Sources on a coaching card (single emission: server-side).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { advisory_id?: string };
  try {
    body = (await req.json()) as { advisory_id?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const advisoryId = typeof body.advisory_id === 'string' ? body.advisory_id.trim() : '';
  if (!advisoryId) {
    return NextResponse.json({ error: 'advisory_id required' }, { status: 400 });
  }

  void captureServerEvent(user.id, 'coaching_facts_expanded', { advisory_id: advisoryId }).catch(
    () => {}
  );

  return NextResponse.json({ ok: true });
}
