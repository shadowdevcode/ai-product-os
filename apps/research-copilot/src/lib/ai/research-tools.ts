import { tool } from 'ai';
import { z } from 'zod';
import { captureServerEvent } from '@/lib/analytics';
import { completeRun, createRun, insertEvidence } from '@/lib/db';
import { gateExecutionTool } from '@/lib/ai/execution-gate';

const depthSchema = z.enum(['shallow', 'standard', 'deep']);

export type ResearchToolContext = {
  sessionId: string;
  userId: string;
  runState: { id?: string; firstCitedSent?: boolean };
};

async function ensureRun(ctx: ResearchToolContext, distinctId: string): Promise<string> {
  if (ctx.runState.id) {
    return ctx.runState.id;
  }
  const { id } = await createRun(ctx.sessionId);
  ctx.runState.id = id;
  await captureServerEvent(distinctId, 'research_run_started', {
    session_id: ctx.sessionId,
    run_id: id,
  });
  return id;
}

export function createResearchTools(ctx: ResearchToolContext) {
  const distinctId = ctx.userId;

  const planningTools = {
    ask_clarification: tool({
      description:
        'Ask the user a single clarifying question before proposing sources. No external APIs.',
      inputSchema: z.object({
        question: z.string().describe('One focused question for the PM.'),
      }),
      execute: async ({ question }) => ({ type: 'clarification' as const, question }),
    }),
    propose_plan: tool({
      description:
        'Propose a research plan with selectable sources and depth. Does not run external research.',
      inputSchema: z.object({
        title: z.string().optional(),
        sources: z.array(z.string()),
        depth: depthSchema,
        notes: z.string().optional(),
      }),
      execute: async (input) => {
        await captureServerEvent(distinctId, 'research_plan_proposed', {
          sources: input.sources,
          depth: input.depth,
        });
        return { type: 'plan_proposal' as const, plan: input };
      },
    }),
  };

  async function execStub(
    toolName: string,
    build: (runId: string) => Promise<Record<string, unknown>>
  ): Promise<Record<string, unknown>> {
    const t0 = Date.now();
    await captureServerEvent(distinctId, 'ai_tool_call_started', {
      tool: toolName,
      session_id: ctx.sessionId,
    });
    const gate = await gateExecutionTool(ctx.sessionId, ctx.userId);
    if (!gate.ok) {
      await captureServerEvent(distinctId, 'ai_tool_call_completed', {
        tool: toolName,
        session_id: ctx.sessionId,
        ok: false,
        error_type: gate.code,
        latency_ms: Date.now() - t0,
      });
      return {
        error: gate.code,
        message:
          gate.code === 'PLAN_NOT_APPROVED'
            ? 'Plan must be approved before external research tools run.'
            : 'Session is not ready for this tool.',
      };
    }
    const runId = await ensureRun(ctx, distinctId);
    const out = await build(runId);
    await captureServerEvent(distinctId, 'ai_tool_call_completed', {
      tool: toolName,
      session_id: ctx.sessionId,
      ok: true,
      latency_ms: Date.now() - t0,
    });
    await captureServerEvent(distinctId, 'research_run_step_completed', {
      tool: toolName,
      session_id: ctx.sessionId,
      run_id: runId,
    });
    return { ...out, run_id: runId };
  }

  const executionTools = {
    web_serp: tool({
      description: 'Search the public web (SERP) after plan approval. Stub in T0.',
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) =>
        execStub('web_serp', async () => ({
          source: 'web_serp',
          query,
          evidence: [
            {
              title: 'Stub result',
              url: 'https://example.com',
              snippet: `T0 stub evidence for: ${query}`,
            },
          ],
        })),
    }),
    social_reddit: tool({
      description: 'Scan Reddit after plan approval. Stub in T0.',
      inputSchema: z.object({ topic: z.string() }),
      execute: async ({ topic }) =>
        execStub('social_reddit', async () => ({
          source: 'reddit',
          topic,
          evidence: [
            {
              title: 'r/productmanagement thread (stub)',
              url: 'https://reddit.com',
              snippet: `Stub Reddit signal for: ${topic}`,
            },
          ],
        })),
    }),
    app_reviews: tool({
      description: 'Fetch app store reviews after plan approval. Stub in T0.',
      inputSchema: z.object({ app_name: z.string() }),
      execute: async ({ app_name }) =>
        execStub('app_reviews', async () => ({
          source: 'app_reviews',
          app_name,
          evidence: [
            {
              title: `${app_name} reviews (stub)`,
              url: 'https://example.com/app',
              snippet: '“Great UX but sync issues” (stub review)',
            },
          ],
        })),
    }),
    nlp_synthesize: tool({
      description:
        'Synthesize cited findings Markdown from evidence. Stub in T0 — requires plan approval.',
      inputSchema: z.object({ focus: z.string().optional() }),
      execute: async (input) => {
        const t0 = Date.now();
        await captureServerEvent(distinctId, 'ai_tool_call_started', {
          tool: 'nlp_synthesize',
          session_id: ctx.sessionId,
        });
        const gate = await gateExecutionTool(ctx.sessionId, ctx.userId);
        if (!gate.ok) {
          await captureServerEvent(distinctId, 'ai_tool_call_completed', {
            tool: 'nlp_synthesize',
            ok: false,
            error_type: gate.code,
            latency_ms: Date.now() - t0,
          });
          return {
            error: gate.code,
            message: 'Plan approval required before synthesis.',
          };
        }
        const runId = await ensureRun(ctx, distinctId);
        const findings = [
          '## Findings (T0 stub)',
          '',
          '- **Pain:** Sync reliability concerns (stub) [Stub result](https://example.com)',
          '',
          `_Focus: ${input.focus ?? 'general'}_`,
        ].join('\n');
        await insertEvidence(
          runId,
          'synthetic',
          'https://example.com',
          'Stub snippet for first cited finding',
          { phase: 't0' }
        );
        if (!ctx.runState.firstCitedSent) {
          ctx.runState.firstCitedSent = true;
          await captureServerEvent(distinctId, 'first_cited_finding_rendered', {
            session_id: ctx.sessionId,
            seconds_since_session_start: 1,
          });
        }
        await completeRun(
          runId,
          {
            findings_markdown: findings,
            brief_markdown: '## Brief (T0 stub)\n\nCoverage: mock.',
          },
          { confidence: 0.42, gaps: ['T0 mock data only'] }
        );
        await captureServerEvent(distinctId, 'ai_tool_call_completed', {
          tool: 'nlp_synthesize',
          ok: true,
          latency_ms: Date.now() - t0,
        });
        await captureServerEvent(distinctId, 'research_run_step_completed', {
          tool: 'nlp_synthesize',
          session_id: ctx.sessionId,
          run_id: runId,
        });
        return { findings_markdown: findings, run_id: runId };
      },
    }),
  };

  return { ...planningTools, ...executionTools };
}
