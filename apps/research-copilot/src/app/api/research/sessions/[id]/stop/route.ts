import { NextResponse } from 'next/server';
import { captureServerEvent } from '@/lib/analytics';
import { getDevUserId, stopSession } from '@/lib/db';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const userId = getDevUserId();
    const session = await stopSession(id, userId);
    if (!session) {
      return NextResponse.json({ error: 'Nothing to stop' }, { status: 409 });
    }
    await captureServerEvent(userId, 'research_run_stopped', { session_id: id });
    return NextResponse.json({ session });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
