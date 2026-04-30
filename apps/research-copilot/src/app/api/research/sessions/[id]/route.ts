import { NextResponse } from 'next/server';
import { getDevUserId, getSessionById, listUIMessages } from '@/lib/db';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const userId = getDevUserId();
    const session = await getSessionById(id, userId);
    if (!session) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const messages = await listUIMessages(id, userId);
    return NextResponse.json({ session, messages });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
