import { NextResponse } from 'next/server';
import { z } from 'zod';
import { captureServerEvent } from '@/lib/analytics';
import { getDevUserId, getLatestRunCoverage, getSessionById, insertExportMarkdown } from '@/lib/db';

const bodySchema = z.object({
  which: z.enum(['findings', 'brief', 'both']).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const userId = getDevUserId();
    const session = await getSessionById(id, userId);
    if (!session) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const json = await req.json().catch(() => ({}));
    const { which } = bodySchema.parse(json);
    const w = which ?? 'both';
    const coverage = await getLatestRunCoverage(id);
    const findings =
      typeof coverage?.findings_markdown === 'string' ? coverage.findings_markdown : '';
    const brief = typeof coverage?.brief_markdown === 'string' ? coverage.brief_markdown : '';
    let md = '';
    if (w === 'findings') {
      md = findings;
    } else if (w === 'brief') {
      md = brief;
    } else {
      md = [brief && `# Brief\n\n${brief}`, findings && `# Findings\n\n${findings}`]
        .filter(Boolean)
        .join('\n\n---\n\n');
    }
    await insertExportMarkdown(id, md);
    await captureServerEvent(userId, 'artifact_exported_markdown', {
      session_id: id,
      which: w,
    });
    return new NextResponse(md, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="research-${id.slice(0, 8)}.md"`,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
