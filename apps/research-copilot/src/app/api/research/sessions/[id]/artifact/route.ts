import { NextResponse } from 'next/server';
import { getDevUserId, getLatestRunCoverage, getSessionById } from '@/lib/db';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const userId = getDevUserId();
    const session = await getSessionById(id, userId);
    if (!session) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const coverage = await getLatestRunCoverage(id);
    const findings =
      typeof coverage?.findings_markdown === 'string' ? coverage.findings_markdown : '';
    const brief = typeof coverage?.brief_markdown === 'string' ? coverage.brief_markdown : '';
    return NextResponse.json({
      session_id: id,
      brief_markdown: brief,
      findings_markdown: findings,
      coverage,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
