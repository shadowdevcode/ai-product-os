import { NextResponse } from 'next/server';
import { z } from 'zod';
import { captureServerEvent } from '@/lib/analytics';
import { createSession, getDevUserId, listSessions } from '@/lib/db';

const createBody = z.object({
  title: z.string().min(1).max(200).optional(),
});

export async function GET() {
  try {
    const userId = getDevUserId();
    const sessions = await listSessions(userId);
    return NextResponse.json({ sessions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = getDevUserId();
    const json = await req.json().catch(() => ({}));
    const body = createBody.parse(json);
    const title = body.title ?? 'New session';
    const { session } = await createSession(userId, title);
    await captureServerEvent(userId, 'research_session_started', {
      session_id: session.id,
      first_message_from_center_composer: false,
    });
    return NextResponse.json({ session }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
