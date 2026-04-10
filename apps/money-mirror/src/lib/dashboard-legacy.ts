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

export async function fetchDashboardLegacy(
  userId: string,
  statementId: string | null
): Promise<DashboardData | null> {
  const sql = getDb();

  const statementRows = statementId
    ? ((await sql`
        SELECT s.id, s.institution_name, s.statement_type, s.period_start, s.period_end, s.due_date, s.payment_due_paisa, s.minimum_due_paisa, s.credit_limit_paisa, p.perceived_spend_paisa, p.monthly_income_paisa, p.plan, s.nickname, s.account_purpose, s.card_network
        FROM statements s
        LEFT JOIN profiles p ON p.id = s.user_id
        WHERE s.user_id = ${userId}
          AND s.status = 'processed'
          AND s.id = ${statementId}
        LIMIT 1
      `) as {
        id: string;
        institution_name: string;
        statement_type: StatementType;
        period_start: string | null;
        period_end: string | null;
        due_date: string | null;
        payment_due_paisa: number | string | bigint | null;
        minimum_due_paisa: number | string | bigint | null;
        credit_limit_paisa: number | string | bigint | null;
        perceived_spend_paisa: number | string | bigint | null;
        monthly_income_paisa: number | string | bigint | null;
        plan: string | null;
        nickname: string | null;
        account_purpose: string | null;
        card_network: string | null;
      }[])
    : ((await sql`
        SELECT s.id, s.institution_name, s.statement_type, s.period_start, s.period_end, s.due_date, s.payment_due_paisa, s.minimum_due_paisa, s.credit_limit_paisa, p.perceived_spend_paisa, p.monthly_income_paisa, p.plan, s.nickname, s.account_purpose, s.card_network
        FROM statements s
        LEFT JOIN profiles p ON p.id = s.user_id
        WHERE s.user_id = ${userId}
          AND s.status = 'processed'
          AND s.statement_type != 'gmail_sync'
        ORDER BY s.period_end DESC NULLS LAST, s.created_at DESC
        LIMIT 1
      `) as {
        id: string;
        institution_name: string;
        statement_type: StatementType;
        period_start: string | null;
        period_end: string | null;
        due_date: string | null;
        payment_due_paisa: number | string | bigint | null;
        minimum_due_paisa: number | string | bigint | null;
        credit_limit_paisa: number | string | bigint | null;
        perceived_spend_paisa: number | string | bigint | null;
        monthly_income_paisa: number | string | bigint | null;
        plan: string | null;
        nickname: string | null;
        account_purpose: string | null;
        card_network: string | null;
      }[]);

  const row = statementRows[0];
  if (!row) {
    return null;
  }

  const userPlan = normalizeUserPlan(row.plan);

  const statement: StatementRow = {
    id: row.id,
    institution_name: row.institution_name,
    statement_type: row.statement_type,
    period_start: row.period_start,
    period_end: row.period_end,
    due_date: row.due_date,
    payment_due_paisa: row.payment_due_paisa === null ? null : toNumber(row.payment_due_paisa),
    minimum_due_paisa: row.minimum_due_paisa === null ? null : toNumber(row.minimum_due_paisa),
    credit_limit_paisa: row.credit_limit_paisa === null ? null : toNumber(row.credit_limit_paisa),
    perceived_spend_paisa:
      row.perceived_spend_paisa === null ? 0 : toNumber(row.perceived_spend_paisa),
    monthly_income_paisa:
      row.monthly_income_paisa === null ? 0 : toNumber(row.monthly_income_paisa),
    nickname: row.nickname ?? null,
    account_purpose: row.account_purpose ?? null,
    card_network: row.card_network ?? null,
  };

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
    WHERE statement_id = ${statement.id}
      AND user_id = ${userId}
  `) as DashboardAggregateRow[];
  const aggregate = aggregateRows[0];

  const repeatRows = (await sql`
    SELECT
      merchant_key,
      COUNT(*)::bigint AS cnt,
      COALESCE(SUM(amount_paisa), 0)::bigint AS total_paisa
    FROM transactions
    WHERE statement_id = ${statement.id}
      AND user_id = ${userId}
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

  const summary = buildDashboardSummary(aggregate);
  const signals = computeDebitSignals(aggregate, repeatTop, {
    has_credit_card_statement: statement.statement_type === 'credit_card',
    cc_minimum_due_effective_paisa:
      statement.statement_type === 'credit_card' ? statement.minimum_due_paisa : null,
  });
  const advisories = buildAdvisories(summary, statement, signals);

  return {
    statement_id: statement.id,
    institution_name: statement.institution_name,
    statement_type: statement.statement_type,
    period_start: statement.period_start,
    period_end: statement.period_end,
    due_date: statement.due_date,
    payment_due_paisa: statement.payment_due_paisa,
    minimum_due_paisa: statement.minimum_due_paisa,
    credit_limit_paisa: statement.credit_limit_paisa,
    perceived_spend_paisa: statement.perceived_spend_paisa,
    monthly_income_paisa: statement.monthly_income_paisa,
    nickname: statement.nickname,
    account_purpose: statement.account_purpose,
    card_network: statement.card_network,
    transaction_count: toNumber(aggregate.transaction_count),
    summary,
    signals,
    advisories,
    scope: {
      kind: 'single_statement',
      date_from: null,
      date_to: null,
      included_statement_ids: [statement.id],
    },
    perceived_is_profile_baseline: true,
    plan: userPlan,
    month_compare: null,
  };
}
