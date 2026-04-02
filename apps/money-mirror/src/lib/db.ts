import { neon } from '@neondatabase/serverless';

export interface ProfileIdentity {
  id: string;
  email: string;
}

export interface WeeklyRecapStatementRow {
  id: string;
  period_start: string | null;
  period_end: string | null;
  total_debits_paisa: number;
  total_credits_paisa: number;
}

export interface CategoryTotalRow {
  category: string;
  amount_paisa: number;
}

type SqlClient = ReturnType<typeof neon>;

let sqlClient: SqlClient | null = null;

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function getSqlClient(): SqlClient {
  if (!sqlClient) {
    sqlClient = neon(readRequiredEnv('DATABASE_URL'));
  }
  return sqlClient;
}

function toNumber(value: number | string | bigint | null | undefined): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'string') {
    return Number(value);
  }
  return 0;
}

export function getDb(): SqlClient {
  return getSqlClient();
}

export async function ensureProfile(identity: ProfileIdentity): Promise<void> {
  const sql = getSqlClient();
  await sql`
    INSERT INTO profiles (id, email)
    VALUES (${identity.id}, ${identity.email})
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email
  `;
}

export async function upsertProfileOnboarding(
  identity: ProfileIdentity,
  moneyHealthScore: number,
  perceivedSpendPaisa: number,
  onboardedAtIso: string
): Promise<void> {
  const sql = getSqlClient();
  await sql`
    INSERT INTO profiles (
      id,
      email,
      money_health_score,
      perceived_spend_paisa,
      onboarded_at
    )
    VALUES (
      ${identity.id},
      ${identity.email},
      ${moneyHealthScore},
      ${perceivedSpendPaisa},
      ${onboardedAtIso}::timestamptz
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      money_health_score = EXCLUDED.money_health_score,
      perceived_spend_paisa = EXCLUDED.perceived_spend_paisa,
      onboarded_at = EXCLUDED.onboarded_at
  `;
}

export async function getPerceivedSpendPaisa(userId: string): Promise<number> {
  const sql = getSqlClient();
  const rows = (await sql`
    SELECT perceived_spend_paisa
    FROM profiles
    WHERE id = ${userId}
    LIMIT 1
  `) as { perceived_spend_paisa: number | string | bigint }[];

  const row = rows[0];
  if (!row) {
    return 0;
  }

  return toNumber(row.perceived_spend_paisa);
}

export async function countUserStatementsSince(userId: string, fromIso: string): Promise<number> {
  const sql = getSqlClient();
  const rows = (await sql`
    SELECT COUNT(*)::int AS count
    FROM statements
    WHERE user_id = ${userId}
      AND created_at >= ${fromIso}::timestamptz
  `) as { count: number | string }[];

  return toNumber(rows[0]?.count);
}

export async function listEligibleWeeklyRecapUsers(
  limit: number,
  offset: number
): Promise<string[]> {
  const sql = getSqlClient();
  const rows = (await sql`
    SELECT user_id
    FROM statements
    WHERE status = 'processed'
    GROUP BY user_id
    ORDER BY MAX(created_at) DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `) as { user_id: string }[];

  return rows.map((row) => row.user_id);
}

export async function getProfileEmail(userId: string): Promise<string | null> {
  const sql = getSqlClient();
  const rows = (await sql`
    SELECT email
    FROM profiles
    WHERE id = ${userId}
    LIMIT 1
  `) as { email: string }[];

  return rows[0]?.email ?? null;
}

export async function getLatestProcessedStatementForUser(
  userId: string
): Promise<WeeklyRecapStatementRow | null> {
  const sql = getSqlClient();
  const rows = (await sql`
    SELECT id, period_start, period_end, total_debits_paisa, total_credits_paisa
    FROM statements
    WHERE user_id = ${userId}
      AND status = 'processed'
    ORDER BY created_at DESC
    LIMIT 1
  `) as {
    id: string;
    period_start: string | null;
    period_end: string | null;
    total_debits_paisa: number | string | bigint;
    total_credits_paisa: number | string | bigint;
  }[];

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    period_start: row.period_start,
    period_end: row.period_end,
    total_debits_paisa: toNumber(row.total_debits_paisa),
    total_credits_paisa: toNumber(row.total_credits_paisa),
  };
}

export async function getTopCategoryTotalsForStatement(
  statementId: string,
  userId: string,
  limit: number
): Promise<CategoryTotalRow[]> {
  const sql = getSqlClient();
  const rows = (await sql`
    SELECT category, SUM(amount_paisa)::bigint AS amount_paisa
    FROM transactions
    WHERE statement_id = ${statementId}
      AND user_id = ${userId}
      AND type = 'debit'
    GROUP BY category
    ORDER BY SUM(amount_paisa) DESC
    LIMIT ${limit}
  `) as { category: string; amount_paisa: number | string | bigint }[];

  return rows.map((row) => ({
    category: row.category,
    amount_paisa: toNumber(row.amount_paisa),
  }));
}

export { toNumber };
