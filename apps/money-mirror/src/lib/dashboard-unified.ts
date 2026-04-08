import { MICRO_UPI_MAX_AMOUNT_PAISA } from '@/lib/bad-pattern-signals';
import { getDb, toNumber } from '@/lib/db';
import type { StatementType } from '@/lib/statements';
import {
  buildAdvisories,
  buildDashboardSummary,
  computeDebitSignals,
  type RepeatMerchantScopeRow,
} from '@/lib/dashboard-helpers';
import type { DashboardAggregateRow, DashboardData, StatementRow } from '@/lib/dashboard-types';
import { normalizeUserPlan } from '@/lib/user-plan';

export async function fetchDashboardUnified(
  userId: string,
  dateFrom: string,
  dateTo: string,
  statementIds: string[] | null
): Promise<DashboardData | null> {
  const sql = getDb();

  let includedIds: string[];
  if (statementIds && statementIds.length > 0) {
    const owned = (await sql`
      SELECT id
      FROM statements
      WHERE user_id = ${userId}
        AND status = 'processed'
        AND id = ANY(${statementIds}::uuid[])
    `) as { id: string }[];
    if (owned.length !== statementIds.length) {
      return null;
    }
    includedIds = owned.map((r) => r.id);
  } else {
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
    includedIds = all.map((r) => r.id);
  }

  const profileRows = (await sql`
    SELECT perceived_spend_paisa, monthly_income_paisa, plan
    FROM profiles
    WHERE id = ${userId}
    LIMIT 1
  `) as {
    perceived_spend_paisa: number | string | bigint | null;
    monthly_income_paisa: number | string | bigint | null;
    plan: string | null;
  }[];
  const prof = profileRows[0];
  const userPlan = normalizeUserPlan(prof?.plan);
  const perceivedProfile =
    prof?.perceived_spend_paisa == null ? 0 : toNumber(prof.perceived_spend_paisa);
  const monthlyIncome =
    prof?.monthly_income_paisa == null ? 0 : toNumber(prof.monthly_income_paisa);

  const aggregateRows = (await sql`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'debit' AND category = 'needs' THEN amount_paisa ELSE 0 END), 0)::bigint AS needs_paisa,
      COALESCE(SUM(CASE WHEN type = 'debit' AND category = 'wants' THEN amount_paisa ELSE 0 END), 0)::bigint AS wants_paisa,
      COALESCE(SUM(CASE WHEN type = 'debit' AND category = 'investment' THEN amount_paisa ELSE 0 END), 0)::bigint AS investment_paisa,
      COALESCE(SUM(CASE WHEN type = 'debit' AND category = 'debt' THEN amount_paisa ELSE 0 END), 0)::bigint AS debt_paisa,
      COALESCE(SUM(CASE WHEN type = 'debit' AND category = 'other' THEN amount_paisa ELSE 0 END), 0)::bigint AS other_paisa,
      COALESCE(SUM(CASE WHEN type = 'debit' THEN amount_paisa ELSE 0 END), 0)::bigint AS total_debits_paisa,
      COALESCE(SUM(CASE WHEN type = 'credit' THEN amount_paisa ELSE 0 END), 0)::bigint AS total_credits_paisa,
      COALESCE(SUM(CASE
        WHEN type = 'debit' AND (
          LOWER(description) LIKE '%swiggy%' OR
          LOWER(description) LIKE '%zomato%' OR
          LOWER(description) LIKE '%eatsure%' OR
          LOWER(description) LIKE '%dunzo%' OR
          LOWER(description) LIKE '%barbeque%' OR
          LOWER(description) LIKE '%starbucks%' OR
          LOWER(description) LIKE '%cafe%' OR
          LOWER(description) LIKE '%restaurant%' OR
          LOWER(description) LIKE '%food%' OR
          LOWER(description) LIKE '%pizza%' OR
          LOWER(description) LIKE '%burger%' OR
          LOWER(description) LIKE '%kfc%' OR
          LOWER(description) LIKE '%mcdonald%' OR
          LOWER(description) LIKE '%domino%'
        ) THEN amount_paisa
        ELSE 0
      END), 0)::bigint AS food_delivery_paisa,
      COALESCE(SUM(CASE
        WHEN type = 'debit' AND (
          LOWER(description) LIKE '%netflix%' OR
          LOWER(description) LIKE '%hotstar%' OR
          LOWER(description) LIKE '%prime%' OR
          LOWER(description) LIKE '%spotify%' OR
          LOWER(description) LIKE '%youtube premium%' OR
          LOWER(description) LIKE '%jiocinema%' OR
          LOWER(description) LIKE '%zee5%' OR
          LOWER(description) LIKE '%sonyliv%' OR
          LOWER(description) LIKE '%subscription%' OR
          LOWER(description) LIKE '%gym%' OR
          LOWER(description) LIKE '%membership%'
        ) THEN amount_paisa
        ELSE 0
      END), 0)::bigint AS subscription_paisa,
      COALESCE(SUM(CASE
        WHEN type = 'debit'
          AND upi_handle IS NOT NULL
          AND TRIM(upi_handle) <> ''
          AND amount_paisa <= ${MICRO_UPI_MAX_AMOUNT_PAISA}
        THEN amount_paisa
        ELSE 0
      END), 0)::bigint AS micro_upi_debit_paisa,
      COALESCE(COUNT(*) FILTER (
        WHERE type = 'debit'
          AND upi_handle IS NOT NULL
          AND TRIM(upi_handle) <> ''
          AND amount_paisa <= ${MICRO_UPI_MAX_AMOUNT_PAISA}
      ), 0)::bigint AS micro_upi_debit_count,
      COUNT(*)::bigint AS transaction_count
    FROM transactions
    WHERE user_id = ${userId}
      AND statement_id = ANY(${includedIds}::uuid[])
      AND date >= ${dateFrom}::date
      AND date <= ${dateTo}::date
  `) as DashboardAggregateRow[];
  const aggregate = aggregateRows[0];

  const repeatRows = (await sql`
    SELECT
      merchant_key,
      COUNT(*)::bigint AS cnt,
      COALESCE(SUM(amount_paisa), 0)::bigint AS total_paisa
    FROM transactions
    WHERE user_id = ${userId}
      AND statement_id = ANY(${includedIds}::uuid[])
      AND date >= ${dateFrom}::date
      AND date <= ${dateTo}::date
      AND type = 'debit'
      AND merchant_key IS NOT NULL
    GROUP BY merchant_key
    ORDER BY COUNT(*) DESC, SUM(amount_paisa) DESC
    LIMIT 1
  `) as {
    merchant_key: string;
    cnt: number | string | bigint;
    total_paisa: number | string | bigint;
  }[];

  const repeatTop: RepeatMerchantScopeRow = repeatRows[0]
    ? {
        merchant_key: repeatRows[0].merchant_key,
        debit_count: toNumber(repeatRows[0].cnt),
        debit_paisa: toNumber(repeatRows[0].total_paisa),
      }
    : { merchant_key: null, debit_count: 0, debit_paisa: 0 };

  const metaRows = (await sql`
    SELECT id, institution_name, statement_type, nickname, account_purpose, card_network
    FROM statements
    WHERE user_id = ${userId}
      AND id = ANY(${includedIds}::uuid[])
  `) as {
    id: string;
    institution_name: string;
    statement_type: StatementType;
    nickname: string | null;
    account_purpose: string | null;
    card_network: string | null;
  }[];

  const ccMinRows = (await sql`
    SELECT COALESCE(
      MAX(s.minimum_due_paisa) FILTER (WHERE s.statement_type = 'credit_card'),
      NULL
    )::bigint AS cc_min_due
    FROM statements s
    WHERE s.user_id = ${userId}
      AND s.id = ANY(${includedIds}::uuid[])
  `) as { cc_min_due: number | string | bigint | null }[];
  const hasCreditCardStatement = metaRows.some((m) => m.statement_type === 'credit_card');
  const ccMinRaw = ccMinRows[0]?.cc_min_due;
  const ccMinimumDueEffective =
    ccMinRaw === null || ccMinRaw === undefined ? null : toNumber(ccMinRaw);

  const institutionLabel =
    metaRows.length > 1 ? 'Multiple accounts' : (metaRows[0]?.institution_name ?? '—');
  const primaryId = includedIds[0];
  const syntheticStatement: StatementRow = {
    id: primaryId,
    institution_name: institutionLabel,
    statement_type: 'bank_account',
    period_start: dateFrom,
    period_end: dateTo,
    due_date: null,
    payment_due_paisa: null,
    minimum_due_paisa: null,
    credit_limit_paisa: null,
    perceived_spend_paisa: perceivedProfile,
    monthly_income_paisa: monthlyIncome,
    nickname: metaRows.length === 1 ? (metaRows[0]?.nickname ?? null) : null,
    account_purpose: metaRows.length === 1 ? (metaRows[0]?.account_purpose ?? null) : null,
    card_network: null,
  };

  const summary = buildDashboardSummary(aggregate);
  const signals = computeDebitSignals(aggregate, repeatTop, {
    has_credit_card_statement: hasCreditCardStatement,
    cc_minimum_due_effective_paisa: ccMinimumDueEffective,
  });
  const advisories = buildAdvisories(summary, syntheticStatement, signals);

  return {
    statement_id: primaryId,
    institution_name: institutionLabel,
    statement_type: 'bank_account',
    period_start: dateFrom,
    period_end: dateTo,
    due_date: null,
    payment_due_paisa: null,
    minimum_due_paisa: null,
    credit_limit_paisa: null,
    perceived_spend_paisa: perceivedProfile,
    monthly_income_paisa: monthlyIncome,
    nickname: syntheticStatement.nickname,
    account_purpose: syntheticStatement.account_purpose,
    card_network: null,
    transaction_count: toNumber(aggregate.transaction_count),
    summary,
    signals,
    advisories,
    scope: {
      kind: 'unified',
      date_from: dateFrom,
      date_to: dateTo,
      included_statement_ids: includedIds,
    },
    perceived_is_profile_baseline: true,
    plan: userPlan,
    month_compare: null,
  };
}
