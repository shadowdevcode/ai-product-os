import { neon } from '@neondatabase/serverless';

let _sql: ReturnType<typeof neon> | null = null;

function getDb() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL environment variable is not set');
    _sql = neon(url);
  }
  return _sql;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExperimentCohort {
  id: string;
  user_id: string;
  experiment_id: string;
  cohort: 'control' | 'test';
  assigned_at: string;
}

export interface UserAffinityProfile {
  id: string;
  user_id: string;
  top_brands: string[];
  top_categories: string[];
  order_count: number;
  session_count: number;
  updated_at: string;
}

export interface SessionEvent {
  id: string;
  user_id: string;
  session_id: string;
  product_id: string;
  brand_id: string | null;
  category_id: string | null;
  event_type: string;
  created_at: string;
}

// ─── experiment_cohorts ───────────────────────────────────────────────────────

export async function getCohort(
  userId: string,
  experimentId = 'personalisation-v1'
): Promise<ExperimentCohort | null> {
  const sql = getDb();
  const rows = (await sql`
    SELECT * FROM experiment_cohorts
    WHERE user_id = ${userId} AND experiment_id = ${experimentId}
    LIMIT 1
  `) as Row[];
  return (rows[0] as ExperimentCohort) ?? null;
}

export async function upsertCohort(
  userId: string,
  cohort: 'control' | 'test',
  experimentId = 'personalisation-v1'
): Promise<ExperimentCohort> {
  const sql = getDb();
  // Write-once: first assignment wins. DO NOT change to DO UPDATE.
  const inserted = (await sql`
    INSERT INTO experiment_cohorts (user_id, experiment_id, cohort)
    VALUES (${userId}, ${experimentId}, ${cohort})
    ON CONFLICT (user_id, experiment_id) DO NOTHING
    RETURNING *
  `) as Row[];
  if (inserted[0]) return inserted[0] as ExperimentCohort;
  const existing = (await sql`
    SELECT * FROM experiment_cohorts
    WHERE user_id = ${userId} AND experiment_id = ${experimentId}
    LIMIT 1
  `) as Row[];
  return existing[0] as ExperimentCohort;
}

// ─── user_affinity_profiles ──────────────────────────────────────────────────

export async function getAffinityProfile(userId: string): Promise<UserAffinityProfile | null> {
  const sql = getDb();
  const rows = (await sql`
    SELECT * FROM user_affinity_profiles
    WHERE user_id = ${userId}
    LIMIT 1
  `) as Row[];
  return (rows[0] as UserAffinityProfile) ?? null;
}

export async function upsertAffinityProfile(params: {
  userId: string;
  topBrands: string[];
  topCategories: string[];
  orderCount: number;
  sessionCount: number;
}): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO user_affinity_profiles (user_id, top_brands, top_categories, order_count, session_count, updated_at)
    VALUES (${params.userId}, ${params.topBrands}, ${params.topCategories}, ${params.orderCount}, ${params.sessionCount}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      top_brands = ${params.topBrands},
      top_categories = ${params.topCategories},
      order_count = ${params.orderCount},
      session_count = ${params.sessionCount},
      updated_at = NOW()
  `;
}

export async function upsertAffinityProfilesBatch(
  batch: {
    userId: string;
    topBrands: string[];
    topCategories: string[];
    orderCount: number;
    sessionCount: number;
  }[]
): Promise<void> {
  const sql = getDb();
  // Neon serverless doesn't support batching multiple statements in a single transaction via template strings easily,
  // but we can optimize by using parallel execution in a single batch of promises for this project scale.
  // In a real production at Nykaa scale, we would use a single `INSERT ... VALUES (...), (...)... ON CONFLICT` statement.
  await Promise.allSettled(batch.map((params) => upsertAffinityProfile(params)));
}

// ─── session_events ──────────────────────────────────────────────────────────

export async function insertSessionEvent(params: {
  userId: string;
  sessionId: string;
  productId: string;
  brandId?: string | null;
  categoryId?: string | null;
  eventType?: string;
}): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO session_events (user_id, session_id, product_id, brand_id, category_id, event_type)
    VALUES (${params.userId}, ${params.sessionId}, ${params.productId}, ${params.brandId ?? null}, ${params.categoryId ?? null}, ${params.eventType ?? 'click'})
  `;
}

export async function getRecentSessionEvents(userId: string, limit = 3): Promise<SessionEvent[]> {
  const sql = getDb();
  const rows = (await sql`
    SELECT * FROM session_events
    WHERE user_id = ${userId}
      AND created_at > NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as Row[];
  return rows as SessionEvent[];
}

export async function cleanupExpiredEvents(): Promise<number> {
  const sql = getDb();
  const rows = (await sql`
    DELETE FROM session_events
    WHERE created_at < NOW() - INTERVAL '24 hours'
    RETURNING id
  `) as Row[];
  return rows.length;
}

// ─── Seed helpers ────────────────────────────────────────────────────────────

export async function seedTestCohorts(
  users: { userId: string; cohort: 'control' | 'test' }[]
): Promise<number> {
  const sql = getDb();
  let count = 0;
  for (const u of users) {
    const rows = (await sql`
      INSERT INTO experiment_cohorts (user_id, experiment_id, cohort)
      VALUES (${u.userId}, 'personalisation-v1', ${u.cohort})
      ON CONFLICT (user_id, experiment_id) DO NOTHING
      RETURNING id
    `) as Row[];
    if (rows.length > 0) count++;
  }
  return count;
}

export async function seedAffinityProfiles(
  profiles: {
    userId: string;
    topBrands: string[];
    topCategories: string[];
    orderCount: number;
    sessionCount: number;
  }[]
): Promise<number> {
  let count = 0;
  for (const p of profiles) {
    await upsertAffinityProfile(p);
    count++;
  }
  return count;
}
