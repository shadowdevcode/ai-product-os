import { NextResponse } from 'next/server';
import { z } from 'zod';
import { captureServerEvent } from '@/lib/analytics';
import { confirmPlan, getDevUserId } from '@/lib/db';

const bodySchema = z.object({
  plan_json: z.unknown().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const userId = getDevUserId();
    const json = await req.json().catch(() => ({}));
    const { plan_json } = bodySchema.parse(json);
    const session = await confirmPlan(id, userId, plan_json ?? {});
    if (!session) {
      return NextResponse.json(
        { error: 'Cannot confirm plan (wrong phase or not found)' },
        { status: 409 }
      );
    }
    // Single emission source: server-side on confirm
    await captureServerEvent(userId, 'research_plan_approved', {
      session_id: id,
    });
    return NextResponse.json({ session });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
