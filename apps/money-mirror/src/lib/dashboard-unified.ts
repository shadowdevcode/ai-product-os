import { getDb, toNumber } from '@/lib/db';
import type { StatementType } from '@/lib/statements';
import {
  buildAdvisories,
  buildDashboardSummary,
  computeDebitSignals,
} from '@/lib/dashboard-helpers';
import type { DashboardAggregateRow, DashboardData, StatementRow } from '@/lib/dashboard-types';

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
    SELECT perceived_spend_paisa, monthly_income_paisa
    FROM profiles
    WHERE id = ${userId}
    LIMIT 1
  `) as {
    perceived_spend_paisa: number | string | bigint | null;
    monthly_income_paisa: number | string | bigint | null;
  }[];
  const prof = profileRows[0];
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
      COUNT(*)::bigint AS transaction_count
    FROM transactions
    WHERE user_id = ${userId}
      AND statement_id = ANY(${includedIds}::uuid[])
      AND date >= ${dateFrom}::date
      AND date <= ${dateTo}::date
  `) as DashboardAggregateRow[];
  const aggregate = aggregateRows[0];

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
  const signals = computeDebitSignals(aggregate);
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
  };
}
