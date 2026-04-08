import { getDb, toNumber } from '@/lib/db';
import type { DashboardFetchInput } from '@/lib/dashboard-types';

type TotalsRow = {
  total_debits_paisa: number | string | bigint;
  total_credits_paisa: number | string | bigint;
};

type LegacyStatementRow = {
  id: string;
  institution_name: string;
  statement_type: string;
  nickname: string | null;
  account_purpose: string | null;
  card_network: string | null;
  period_start: string | null;
  period_end: string | null;
};

export interface CompareMonthsResult {
  scope: {
    statement_ids: string[];
  };
  current: {
    date_from: string;
    date_to: string;
    total_debits_paisa: number;
    total_credits_paisa: number;
  };
  previous: {
    date_from: string;
    date_to: string;
    total_debits_paisa: number;
    total_credits_paisa: number;
  };
  delta: {
    debits_paisa: number;
    credits_paisa: number;
    debits_pct: number | null;
    credits_pct: number | null;
  };
}

function addUtcDays(isoDate: string, delta: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}
async function fetchLegacyCurrentStatement(
  userId: string,
  statementId: string | null
): Promise<LegacyStatementRow | null> {
  const sql = getDb();
  const rows = statementId
    ? ((await sql`
        SELECT
          id,
          institution_name,
          statement_type,
          nickname,
          account_purpose,
          card_network,
          period_start,
          period_end
        FROM statements
        WHERE user_id = ${userId}
          AND status = 'processed'
          AND id = ${statementId}
        LIMIT 1
      `) as LegacyStatementRow[])
    : ((await sql`
        SELECT
          id,
          institution_name,
          statement_type,
          nickname,
          account_purpose,
          card_network,
          period_start,
          period_end
        FROM statements
        WHERE user_id = ${userId}
          AND status = 'processed'
        ORDER BY period_end DESC NULLS LAST, created_at DESC
        LIMIT 1
      `) as LegacyStatementRow[]);
  return rows[0] ?? null;
}

async function fetchLegacyPreviousStatement(
  userId: string,
  current: LegacyStatementRow
): Promise<LegacyStatementRow | null> {
  if (!current.period_start) {
    return null;
  }

  const sql = getDb();
  const rows = (await sql`
    SELECT
      id,
      institution_name,
      statement_type,
      nickname,
      account_purpose,
      card_network,
      period_start,
      period_end
    FROM statements
    WHERE user_id = ${userId}
      AND status = 'processed'
      AND id <> ${current.id}
      AND institution_name = ${current.institution_name}
      AND statement_type = ${current.statement_type}
      AND nickname IS NOT DISTINCT FROM ${current.nickname}
      AND account_purpose IS NOT DISTINCT FROM ${current.account_purpose}
      AND card_network IS NOT DISTINCT FROM ${current.card_network}
      AND period_start IS NOT NULL
      AND period_end IS NOT NULL
      AND period_end < ${current.period_start}::date
    ORDER BY period_end DESC, created_at DESC
    LIMIT 1
  `) as LegacyStatementRow[];
  return rows[0] ?? null;
}
async function resolveCompareScope(
  userId: string,
  input: DashboardFetchInput
): Promise<{
  currentStatementIds: string[];
  previousStatementIds: string[];
  currentDateFrom: string;
  currentDateTo: string;
  previousDateFrom: string;
  previousDateTo: string;
} | null> {
  const sql = getDb();
  if (input.variant === 'unified') {
    if (input.statementIds && input.statementIds.length > 0) {
      const owned = (await sql`
        SELECT id
        FROM statements
        WHERE user_id = ${userId}
          AND status = 'processed'
          AND id = ANY(${input.statementIds}::uuid[])
      `) as { id: string }[];
      if (owned.length !== input.statementIds.length) {
        return null;
      }
      const currentDateFrom = input.dateFrom;
      const currentDateTo = input.dateTo;
      const daysInclusive =
        Math.floor(
          (new Date(`${currentDateTo}T00:00:00Z`).getTime() -
            new Date(`${currentDateFrom}T00:00:00Z`).getTime()) /
            86400000
        ) + 1;
      if (daysInclusive <= 0) {
        return null;
      }
      const previousDateTo = addUtcDays(currentDateFrom, -1);
      const previousDateFrom = addUtcDays(previousDateTo, -(daysInclusive - 1));
      return {
        currentStatementIds: owned.map((r) => r.id),
        previousStatementIds: owned.map((r) => r.id),
        currentDateFrom,
        currentDateTo,
        previousDateFrom,
        previousDateTo,
      };
    }
    const all = (await sql`
      SELECT id
      FROM statements
      WHERE user_id = ${userId}
        AND status = 'processed'
      ORDER BY period_end DESC NULLS LAST, created_at DESC
    `) as { id: string }[];
    if (all.length === 0) {
      return null;
    }
    const currentDateFrom = input.dateFrom;
    const currentDateTo = input.dateTo;
    const daysInclusive =
      Math.floor(
        (new Date(`${currentDateTo}T00:00:00Z`).getTime() -
          new Date(`${currentDateFrom}T00:00:00Z`).getTime()) /
          86400000
      ) + 1;
    if (daysInclusive <= 0) {
      return null;
    }
    const previousDateTo = addUtcDays(currentDateFrom, -1);
    const previousDateFrom = addUtcDays(previousDateTo, -(daysInclusive - 1));
    return {
      currentStatementIds: all.map((r) => r.id),
      previousStatementIds: all.map((r) => r.id),
      currentDateFrom,
      currentDateTo,
      previousDateFrom,
      previousDateTo,
    };
  }

  const current = await fetchLegacyCurrentStatement(userId, input.statementId);
  if (!current || !current.period_start || !current.period_end) {
    return null;
  }
  const previous = await fetchLegacyPreviousStatement(userId, current);
  if (!previous || !previous.period_start || !previous.period_end) {
    return null;
  }

  return {
    currentStatementIds: [current.id],
    previousStatementIds: [previous.id],
    currentDateFrom: current.period_start,
    currentDateTo: current.period_end,
    previousDateFrom: previous.period_start,
    previousDateTo: previous.period_end,
  };
}

async function fetchTotals(
  userId: string,
  statementIds: string[],
  dateFrom: string,
  dateTo: string
): Promise<{ totalDebitsPaisa: number; totalCreditsPaisa: number }> {
  const sql = getDb();
  const rows = (await sql`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'debit' THEN amount_paisa ELSE 0 END), 0)::bigint AS total_debits_paisa,
      COALESCE(SUM(CASE WHEN type = 'credit' THEN amount_paisa ELSE 0 END), 0)::bigint AS total_credits_paisa
    FROM transactions
    WHERE user_id = ${userId}
      AND statement_id = ANY(${statementIds}::uuid[])
      AND date >= ${dateFrom}::date
      AND date <= ${dateTo}::date
  `) as TotalsRow[];

  return {
    totalDebitsPaisa: toNumber(rows[0]?.total_debits_paisa ?? 0),
    totalCreditsPaisa: toNumber(rows[0]?.total_credits_paisa ?? 0),
  };
}

export async function fetchCompareMonthsData(
  userId: string,
  input: DashboardFetchInput
): Promise<CompareMonthsResult | null> {
  const scope = await resolveCompareScope(userId, input);
  if (!scope) {
    return null;
  }

  const current = await fetchTotals(
    userId,
    scope.currentStatementIds,
    scope.currentDateFrom,
    scope.currentDateTo
  );
  const previous = await fetchTotals(
    userId,
    scope.previousStatementIds,
    scope.previousDateFrom,
    scope.previousDateTo
  );

  return {
    scope: {
      statement_ids: scope.currentStatementIds,
    },
    current: {
      date_from: scope.currentDateFrom,
      date_to: scope.currentDateTo,
      total_debits_paisa: current.totalDebitsPaisa,
      total_credits_paisa: current.totalCreditsPaisa,
    },
    previous: {
      date_from: scope.previousDateFrom,
      date_to: scope.previousDateTo,
      total_debits_paisa: previous.totalDebitsPaisa,
      total_credits_paisa: previous.totalCreditsPaisa,
    },
    delta: {
      debits_paisa: current.totalDebitsPaisa - previous.totalDebitsPaisa,
      credits_paisa: current.totalCreditsPaisa - previous.totalCreditsPaisa,
      debits_pct: pctDelta(current.totalDebitsPaisa, previous.totalDebitsPaisa),
      credits_pct: pctDelta(current.totalCreditsPaisa, previous.totalCreditsPaisa),
    },
  };
}
