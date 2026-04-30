import { convertToModelMessages, generateId, stepCountIs, streamText, type UIMessage } from 'ai';
import { appendUIMessage, getSessionById, syncMessagesFromClient } from '@/lib/db';
import { getLeadModel } from '@/lib/ai/openrouter';
import { createResearchTools, type ResearchToolContext } from '@/lib/ai/research-tools';

const LEAD_SYSTEM = `You are a PM research copilot. Always behave as a conversation:
1) Ask clarifying questions when needed.
2) Propose a research plan with sources and depth using propose_plan (no external research before approval).
3) Never claim you ran web, app reviews, Reddit, or synthesis tools until the user has approved the plan in the UI.
4) After approval (server-enforced), you may call execution tools to gather evidence and synthesize findings.
5) Keep transparency: reference tool outputs and citations.`;

export async function runResearchChatStream(options: {
  sessionId: string;
  userId: string;
  messages: UIMessage[];
  abortSignal?: AbortSignal;
}): Promise<Response> {
  await syncMessagesFromClient(options.sessionId, options.userId, options.messages);
  const session = await getSessionById(options.sessionId, options.userId);
  if (!session) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }

  const model = getLeadModel();
  const ctx: ResearchToolContext = {
    sessionId: options.sessionId,
    userId: options.userId,
    runState: {},
  };
  const tools = createResearchTools(ctx);
  const approved = Boolean(session.plan_approved_at);
  const activeTools = approved
    ? (Object.keys(tools) as (keyof typeof tools)[])
    : (['ask_clarification', 'propose_plan'] as (keyof typeof tools)[]);

  const result = streamText({
    model,
    system: LEAD_SYSTEM,
    messages: await convertToModelMessages(options.messages),
    tools,
    activeTools,
    stopWhen: stepCountIs(14),
    abortSignal: options.abortSignal,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: options.messages,
    generateMessageId: generateId,
    onFinish: async ({ responseMessage }) => {
      await appendUIMessage(options.sessionId, responseMessage);
    },
  });
}
