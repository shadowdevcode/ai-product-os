import { safeValidateUIMessages } from 'ai';
import { getDevUserId } from '@/lib/db';
import { runResearchChatStream } from '@/lib/ai/run-chat';

export const maxDuration = 120;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: sessionId } = await ctx.params;
    const userId = getDevUserId();
    const body = await req.json();
    const parsed = await safeValidateUIMessages({ messages: body.messages ?? [] });
    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid messages', details: String(parsed.error) },
        { status: 400 }
      );
    }
    const messages = parsed.data;
    return runResearchChatStream({
      sessionId,
      userId,
      messages,
      abortSignal: req.signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    if (msg.includes('OPENROUTER_API_KEY')) {
      return Response.json({ error: 'LLM not configured', detail: msg }, { status: 503 });
    }
    return Response.json({ error: msg }, { status: 500 });
  }
}
