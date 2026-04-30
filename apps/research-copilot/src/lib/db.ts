import { neon } from '@neondatabase/serverless';
import type { UIMessage } from 'ai';

export type SessionPhase = 'planning' | 'executing' | 'stopped' | 'completed';

export interface ResearchSessionRow {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  phase: SessionPhase;
  plan_approved_at: string | null;
  stopped_at: string | null;
  centered_entry: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResearchProjectRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

type Sql = ReturnType<typeof neon>;

let sqlClient: Sql | null = null;

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export function getDevUserId(): string {
  return readRequiredEnv('RESEARCH_DEV_USER_ID');
}

function getSql(): Sql {
  if (!sqlClient) {
    sqlClient = neon(readRequiredEnv('DATABASE_URL'));
  }
  return sqlClient;
}

export async function ensureDefaultProject(userId: string): Promise<{ id: string }> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id FROM research_projects
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
    LIMIT 1
  `) as { id: string }[];
  if (rows[0]) {
    return { id: rows[0].id };
  }
  const inserted = (await sql`
    INSERT INTO research_projects (user_id, name)
    VALUES (${userId}, ${'Default project'})
    RETURNING id
  `) as { id: string }[];
  return { id: inserted[0]!.id };
}

export async function createSession(
  userId: string,
  title: string
): Promise<{ session: ResearchSessionRow; projectId: string }> {
  const sql = getSql();
  const { id: projectId } = await ensureDefaultProject(userId);
  const rows = (await sql`
    INSERT INTO research_sessions (project_id, user_id, title, phase, centered_entry)
    VALUES (${projectId}, ${userId}, ${title}, 'planning', true)
    RETURNING id, project_id, user_id, title, phase, plan_approved_at, stopped_at, centered_entry, created_at, updated_at
  `) as ResearchSessionRow[];
  return { session: rows[0]!, projectId };
}

export async function listSessions(userId: string): Promise<ResearchSessionRow[]> {
  const sql = getSql();
  return (await sql`
    SELECT id, project_id, user_id, title, phase, plan_approved_at, stopped_at, centered_entry, created_at, updated_at
    FROM research_sessions
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
    LIMIT 100
  `) as ResearchSessionRow[];
}

export async function listProjects(userId: string): Promise<ResearchProjectRow[]> {
  const sql = getSql();
  return (await sql`
    SELECT id, user_id, name, created_at, updated_at
    FROM research_projects
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
    LIMIT 100
  `) as ResearchProjectRow[];
}

export async function getSessionById(
  sessionId: string,
  userId: string
): Promise<ResearchSessionRow | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, project_id, user_id, title, phase, plan_approved_at, stopped_at, centered_entry, created_at, updated_at
    FROM research_sessions
    WHERE id = ${sessionId}::uuid AND user_id = ${userId}
    LIMIT 1
  `) as ResearchSessionRow[];
  return rows[0] ?? null;
}

export async function confirmPlan(
  sessionId: string,
  userId: string,
  planJson: unknown
): Promise<ResearchSessionRow | null> {
  const sql = getSql();
  const now = new Date().toISOString();
  const rows = (await sql`
    UPDATE research_sessions
    SET
      phase = 'executing',
      plan_approved_at = ${now}::timestamptz,
      updated_at = timezone('utc', now())
    WHERE id = ${sessionId}::uuid AND user_id = ${userId} AND phase = 'planning'
    RETURNING id, project_id, user_id, title, phase, plan_approved_at, stopped_at, centered_entry, created_at, updated_at
  `) as ResearchSessionRow[];
  if (!rows[0]) {
    return null;
  }
  await sql`
    INSERT INTO research_plans (session_id, version, plan_json)
    VALUES (${sessionId}::uuid, 1, ${JSON.stringify(planJson ?? {})}::jsonb)
  `;
  return rows[0]!;
}

export async function stopSession(
  sessionId: string,
  userId: string
): Promise<ResearchSessionRow | null> {
  const sql = getSql();
  const now = new Date().toISOString();
  const rows = (await sql`
    UPDATE research_sessions
    SET
      phase = 'stopped',
      stopped_at = ${now}::timestamptz,
      updated_at = timezone('utc', now())
    WHERE id = ${sessionId}::uuid AND user_id = ${userId}
      AND phase IN ('planning', 'executing')
    RETURNING id, project_id, user_id, title, phase, plan_approved_at, stopped_at, centered_entry, created_at, updated_at
  `) as ResearchSessionRow[];
  return rows[0] ?? null;
}

export async function appendUIMessage(sessionId: string, message: UIMessage): Promise<void> {
  const sql = getSql();
  const payload = JSON.stringify(message);
  await sql`
    INSERT INTO research_messages (session_id, role, content)
    VALUES (${sessionId}::uuid, ${message.role}, ${payload}::jsonb)
  `;
  await sql`
    UPDATE research_sessions SET updated_at = timezone('utc', now()) WHERE id = ${sessionId}::uuid
  `;
}

export async function listUIMessages(sessionId: string, userId: string): Promise<UIMessage[]> {
  const session = await getSessionById(sessionId, userId);
  if (!session) {
    return [];
  }
  const sql = getSql();
  const rows = (await sql`
    SELECT content FROM research_messages
    WHERE session_id = ${sessionId}::uuid
    ORDER BY created_at ASC
  `) as { content: UIMessage }[];
  return rows.map((r) => r.content);
}

/** Sync client-ordered UI messages to DB by appending only new tail rows. */
export async function syncMessagesFromClient(
  sessionId: string,
  userId: string,
  uiMessages: UIMessage[]
): Promise<void> {
  const session = await getSessionById(sessionId, userId);
  if (!session) {
    throw new Error('Session not found');
  }
  const existing = await listUIMessages(sessionId, userId);
  for (let i = existing.length; i < uiMessages.length; i++) {
    await appendUIMessage(sessionId, uiMessages[i]!);
  }
}

export async function createRun(sessionId: string): Promise<{ id: string }> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO research_runs (session_id, status, coverage_json, confidence_json)
    VALUES (${sessionId}::uuid, 'running', '{}'::jsonb, '{}'::jsonb)
    RETURNING id
  `) as { id: string }[];
  return { id: rows[0]!.id };
}

export async function completeRun(
  runId: string,
  coverage: Record<string, unknown>,
  confidence: Record<string, unknown>
): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE research_runs
    SET
      status = 'completed',
      coverage_json = ${JSON.stringify(coverage)}::jsonb,
      confidence_json = ${JSON.stringify(confidence)}::jsonb,
      completed_at = timezone('utc', now())
    WHERE id = ${runId}::uuid
  `;
}

export async function getLatestRunCoverage(
  sessionId: string
): Promise<Record<string, unknown> | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT coverage_json FROM research_runs
    WHERE session_id = ${sessionId}::uuid
    ORDER BY started_at DESC
    LIMIT 1
  `) as { coverage_json: Record<string, unknown> }[];
  return rows[0]?.coverage_json ?? null;
}

export async function insertEvidence(
  runId: string,
  sourceType: string,
  sourceUrl: string,
  snippet: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO evidence_snippets (run_id, source_type, source_url, snippet, metadata)
    VALUES (
      ${runId}::uuid,
      ${sourceType},
      ${sourceUrl},
      ${snippet},
      ${JSON.stringify(metadata)}::jsonb
    )
  `;
}

export async function insertExportMarkdown(sessionId: string, payload: string): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO exports (session_id, format, payload)
    VALUES (${sessionId}::uuid, 'markdown', ${payload})
  `;
}
