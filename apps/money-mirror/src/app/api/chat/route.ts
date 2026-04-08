import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSessionUser } from '@/lib/auth/session';
import { ensureProfile, getDb } from '@/lib/db';
import { fetchDashboardData, type DashboardFetchInput } from '@/lib/dashboard';
import { parseDashboardScopeFromSearchParams } from '@/lib/scope';
import { buildLayerAFacts, factIdsFromLayerA, serializeFactsForPrompt } from '@/lib/coaching-facts';
import { captureServerEvent } from '@/lib/posthog';
import { checkRateLimit } from '@/lib/rate-limit';

const CHAT_LIMIT = { limit: 10, windowMs: 24 * 60 * 60 * 1000 };
const CHAT_TIMEOUT_MS = 9_000;
const MAX_PROMPT_TXNS = 20;

type ChatResponsePayload = {
  answer: string;
  cited_fact_ids: string[];
};

function toDashboardInput(req: NextRequest): DashboardFetchInput | { error: string } {
  const parsed = parseDashboardScopeFromSearchParams(req.nextUrl.searchParams);
  if ('error' in parsed) {
    return { error: parsed.error };
  }
  if (parsed.variant === 'unified') {
    return {
      variant: 'unified',
      dateFrom: parsed.scope.dateFrom,
      dateTo: parsed.scope.dateTo,
      statementIds: parsed.scope.statementIds,
    };
  }
  return { variant: 'legacy', statementId: parsed.statementId };
}

async function fetchPromptTransactions(
  userId: string,
  dashboard: Awaited<ReturnType<typeof fetchDashboardData>>
) {
  if (!dashboard) {
    return [];
  }
  const sql = getDb();
  const statementIds = dashboard.scope.included_statement_ids;
  const rows = (await sql`
    SELECT date, description, type, category, amount_paisa
    FROM transactions
    WHERE user_id = ${userId}
      AND statement_id = ANY(${statementIds}::uuid[])
    ORDER BY date DESC, created_at DESC
    LIMIT ${MAX_PROMPT_TXNS}
  `) as Array<{
    date: string;
    description: string;
    type: 'debit' | 'credit';
    category: 'needs' | 'wants' | 'investment' | 'debt' | 'other';
    amount_paisa: number;
  }>;
  return rows.map((row) => ({
    date: row.date,
    description: row.description.slice(0, 140),
    type: row.type,
    category: row.category,
    amount_paisa: row.amount_paisa,
  }));
}

function buildChatPrompt(
  facts: ReturnType<typeof buildLayerAFacts>,
  txnRows: Awaited<ReturnType<typeof fetchPromptTransactions>>,
  message: string
): string {
  return `You are MoneyMirror's educational finance coach for India.
Only use the provided facts and transactions. Do not invent numbers.
If the user asks beyond available evidence, say what is missing.

Facts JSON:
${serializeFactsForPrompt(facts)}

Recent transactions JSON:
${JSON.stringify(txnRows)}

Return strict JSON:
{"answer":"string","cited_fact_ids":["id1","id2"]}

Rules:
- Keep answer concise (max 5 sentences), clear, and non-judgmental.
- No investment advice or security recommendations.
- cited_fact_ids must be non-empty and drawn from Facts JSON ids only.

User question:
${message}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(`chat:post:${user.id}`, CHAT_LIMIT);
  if (!rate.ok) {
    // Single emission source: server-side in /api/chat
    captureServerEvent(user.id, 'chat_rate_limited', {
      retry_after_sec: rate.retryAfterSec,
    }).catch(() => {});
    return NextResponse.json(
      { error: 'Daily chat limit reached. Try again tomorrow.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
    );
  }

  const body = (await req.json().catch(() => null)) as { message?: string } | null;
  const message = body?.message?.trim() ?? '';
  if (!message || message.length > 500) {
    return NextResponse.json({ error: 'message is required (1-500 chars).' }, { status: 400 });
  }

  const input = toDashboardInput(req);
  if ('error' in input) {
    return NextResponse.json({ error: input.error }, { status: 400 });
  }

  await ensureProfile({ id: user.id, email: user.email });
  const dashboard = await fetchDashboardData(user.id, input);
  if (!dashboard) {
    return NextResponse.json(
      { error: 'Dashboard data unavailable for this scope.' },
      { status: 404 }
    );
  }

  const facts = buildLayerAFacts(dashboard);
  const allowedFactIds = factIdsFromLayerA(facts);
  const txnRows = await fetchPromptTransactions(user.id, dashboard);

  captureServerEvent(user.id, 'chat_query_submitted', {
    message_length: message.length,
    txn_context_count: txnRows.length,
    scope_kind: dashboard.scope.kind,
  }).catch(() => {});

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Chat is currently unavailable.' }, { status: 503 });
  }

  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = buildChatPrompt(facts, txnRows, message);

  const started = Date.now();
  try {
    const llmPromise = genai.models
      .generateContent({
        model: 'gemini-2.5-flash',
        config: { responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      })
      .then((res) => {
        const text = res.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text ?? '';
        const clean = text
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        return JSON.parse(clean) as ChatResponsePayload;
      });
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('CHAT_TIMEOUT')), CHAT_TIMEOUT_MS)
    );
    const parsed = await Promise.race([llmPromise, timeout]);

    const cited = Array.isArray(parsed.cited_fact_ids) ? parsed.cited_fact_ids : [];
    if (
      !parsed.answer?.trim() ||
      cited.length === 0 ||
      cited.some((id) => !allowedFactIds.has(id))
    ) {
      return NextResponse.json({ error: 'Failed to validate chat response.' }, { status: 502 });
    }

    captureServerEvent(user.id, 'chat_response_rendered', {
      latency_ms: Date.now() - started,
      cited_fact_count: cited.length,
    }).catch(() => {});

    return NextResponse.json({
      answer: parsed.answer.trim(),
      cited_fact_ids: cited,
      facts,
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'CHAT_TIMEOUT') {
      return NextResponse.json(
        { error: 'Chat request timed out. Please try again.' },
        { status: 504 }
      );
    }
    return NextResponse.json({ error: 'Chat request failed.' }, { status: 502 });
  }
}
