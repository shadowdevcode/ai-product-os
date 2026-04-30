import { NextResponse } from 'next/server';
import { z } from 'zod';
import { captureServerEvent } from '@/lib/analytics';
import { getDevUserId } from '@/lib/db';

const bodySchema = z.object({
  source_id: z.string().min(1),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const userId = getDevUserId();
    const json = await req.json().catch(() => ({}));
    const { source_id } = bodySchema.parse(json);
    await captureServerEvent(userId, 'research_source_skipped', {
      session_id: id,
      source_id,
    });
    return NextResponse.json({ ok: true, source_id });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
