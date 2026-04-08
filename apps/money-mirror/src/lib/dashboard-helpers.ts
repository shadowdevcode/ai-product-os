import { generateAdvisories, type Advisory } from '@/lib/advisory-engine';
import { toNumber } from '@/lib/db';
import type {
  DashboardAggregateRow,
  DashboardSignals,
  DashboardSummary,
  StatementRow,
} from '@/lib/dashboard-types';
type SqlClient = ReturnType<typeof import('@/lib/db').getDb>;

/** Top repeat merchant from dashboard scope (same WHERE as txn aggregate). */
export type RepeatMerchantScopeRow = {
  merchant_key: string | null;
  debit_count: number;
  debit_paisa: number;
};

export function buildDashboardSummary(aggregate: DashboardAggregateRow): DashboardSummary {
  return {
    needs_paisa: toNumber(aggregate.needs_paisa),
    wants_paisa: toNumber(aggregate.wants_paisa),
    investment_paisa: toNumber(aggregate.investment_paisa),
    debt_paisa: toNumber(aggregate.debt_paisa),
    other_paisa: toNumber(aggregate.other_paisa),
    total_debits_paisa: toNumber(aggregate.total_debits_paisa),
    total_credits_paisa: toNumber(aggregate.total_credits_paisa),
  };
}

export function computeDebitSignals(
  aggregate: DashboardAggregateRow,
  repeat: RepeatMerchantScopeRow,
  ccMeta: { has_credit_card_statement: boolean; cc_minimum_due_effective_paisa: number | null }
): DashboardSignals {
  return {
    food_delivery_paisa: toNumber(aggregate.food_delivery_paisa),
    subscription_paisa: toNumber(aggregate.subscription_paisa),
    micro_upi_debit_paisa: toNumber(aggregate.micro_upi_debit_paisa),
    micro_upi_debit_count: toNumber(aggregate.micro_upi_debit_count),
    repeat_merchant_key: repeat.merchant_key,
    repeat_merchant_debit_count: repeat.debit_count,
    repeat_merchant_debit_paisa: repeat.debit_paisa,
    has_credit_card_statement: ccMeta.has_credit_card_statement,
    cc_minimum_due_effective_paisa: ccMeta.cc_minimum_due_effective_paisa,
  };
}

export interface FrequencyMerchantRow {
  merchant_key: string;
  debit_count: number;
  debit_paisa: number;
}

/**
 * Top merchants by debit count for a user's date scope.
 * Returns up to `limit` rows sorted by frequency descending.
 */
export async function fetchTopMerchantsByFrequency(
  sql: SqlClient,
  userId: string,
  dateFrom: string,
  dateTo: string,
  statementIds: string[] | null,
  limit = 30
): Promise<FrequencyMerchantRow[]> {
  type Row = {
    merchant_key: string;
    debit_count: string | number;
    debit_paisa: string | number | bigint;
  };

  const rows = statementIds
    ? ((await sql`
        SELECT merchant_key,
               COUNT(*)::int AS debit_count,
               COALESCE(SUM(amount_paisa), 0)::bigint AS debit_paisa
        FROM transactions
        WHERE user_id = ${userId}
          AND merchant_key IS NOT NULL
          AND type = 'debit'
          AND date >= ${dateFrom}
          AND date <= ${dateTo}
          AND statement_id = ANY(${statementIds})
        GROUP BY merchant_key
        ORDER BY debit_count DESC
        LIMIT ${limit}
      `) as Row[])
    : ((await sql`
        SELECT merchant_key,
               COUNT(*)::int AS debit_count,
               COALESCE(SUM(amount_paisa), 0)::bigint AS debit_paisa
        FROM transactions
        WHERE user_id = ${userId}
          AND merchant_key IS NOT NULL
          AND type = 'debit'
          AND date >= ${dateFrom}
          AND date <= ${dateTo}
        GROUP BY merchant_key
        ORDER BY debit_count DESC
        LIMIT ${limit}
      `) as Row[]);

  return rows.map((r) => ({
    merchant_key: r.merchant_key,
    debit_count: toNumber(r.debit_count),
    debit_paisa: toNumber(r.debit_paisa),
  }));
}

/**
 * Full-scope merchant aggregates filtered to a fixed key set (no LIMIT).
 *
 * Use for cluster rollups: cluster membership is a small static list, so the
 * `merchant_key = ANY(...)` filter bounds the result naturally and we never
 * have to derive financial totals from a top-N capped sample.
 */
export async function fetchClusterMerchantAggregates(
  sql: SqlClient,
  userId: string,
  dateFrom: string,
  dateTo: string,
  statementIds: string[] | null,
  merchantKeys: string[]
): Promise<FrequencyMerchantRow[]> {
  if (merchantKeys.length === 0) return [];
  type Row = {
    merchant_key: string;
    debit_count: string | number;
    debit_paisa: string | number | bigint;
  };

  const rows = statementIds
    ? ((await sql`
        SELECT merchant_key,
               COUNT(*)::int AS debit_count,
               COALESCE(SUM(amount_paisa), 0)::bigint AS debit_paisa
        FROM transactions
        WHERE user_id = ${userId}
          AND merchant_key = ANY(${merchantKeys})
          AND type = 'debit'
          AND date >= ${dateFrom}
          AND date <= ${dateTo}
          AND statement_id = ANY(${statementIds})
        GROUP BY merchant_key
      `) as Row[])
    : ((await sql`
        SELECT merchant_key,
               COUNT(*)::int AS debit_count,
               COALESCE(SUM(amount_paisa), 0)::bigint AS debit_paisa
        FROM transactions
        WHERE user_id = ${userId}
          AND merchant_key = ANY(${merchantKeys})
          AND type = 'debit'
          AND date >= ${dateFrom}
          AND date <= ${dateTo}
        GROUP BY merchant_key
      `) as Row[]);

  return rows.map((r) => ({
    merchant_key: r.merchant_key,
    debit_count: toNumber(r.debit_count),
    debit_paisa: toNumber(r.debit_paisa),
  }));
}

export function buildAdvisories(
  summary: DashboardSummary,
  statement: StatementRow,
  signals: DashboardSignals
): Advisory[] {
  return generateAdvisories({
    statement_type: statement.statement_type,
    summary: {
      needs: summary.needs_paisa,
      wants: summary.wants_paisa,
      investment: summary.investment_paisa,
      debt: summary.debt_paisa,
      other: summary.other_paisa,
      total_debits: summary.total_debits_paisa,
      total_credits: summary.total_credits_paisa,
    },
    perceived_spend_paisa: statement.perceived_spend_paisa,
    monthly_income_paisa: statement.monthly_income_paisa,
    debt_load_paisa:
      statement.statement_type === 'credit_card'
        ? (statement.payment_due_paisa ?? statement.minimum_due_paisa ?? summary.debt_paisa)
        : summary.debt_paisa,
    food_delivery_paisa: signals.food_delivery_paisa,
    subscription_paisa: signals.subscription_paisa,
    payment_due_paisa: statement.payment_due_paisa,
    minimum_due_paisa: statement.minimum_due_paisa,
    micro_upi_debit_paisa: signals.micro_upi_debit_paisa,
    micro_upi_debit_count: signals.micro_upi_debit_count,
    repeat_merchant_key: signals.repeat_merchant_key,
    repeat_merchant_debit_count: signals.repeat_merchant_debit_count,
    repeat_merchant_debit_paisa: signals.repeat_merchant_debit_paisa,
    has_credit_card_statement: signals.has_credit_card_statement,
    cc_minimum_due_effective_paisa: signals.cc_minimum_due_effective_paisa,
  });
}
