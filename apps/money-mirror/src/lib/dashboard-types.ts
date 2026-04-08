import type { Advisory } from '@/lib/advisory-engine';
import type { StatementType } from '@/lib/statements';
import type { UserPlan } from '@/lib/user-plan';

export interface DashboardSummary {
  needs_paisa: number;
  wants_paisa: number;
  investment_paisa: number;
  debt_paisa: number;
  other_paisa: number;
  total_debits_paisa: number;
  total_credits_paisa: number;
}

/** Heuristic debit signals (same regexes as advisory engine) for Layer A facts. */
export interface DashboardSignals {
  food_delivery_paisa: number;
  subscription_paisa: number;
  /** P4-E: debits with UPI handle and amount ≤ micro threshold. */
  micro_upi_debit_paisa: number;
  micro_upi_debit_count: number;
  /** Merchant with highest debit count in scope (noise pattern). */
  repeat_merchant_key: string | null;
  repeat_merchant_debit_count: number;
  repeat_merchant_debit_paisa: number;
  /** True when scope includes at least one credit card statement (P4-E CC stress). */
  has_credit_card_statement: boolean;
  /** Max/min CC minimum due across CC statements in scope; null if none. */
  cc_minimum_due_effective_paisa: number | null;
}

export interface DashboardScopeMeta {
  kind: 'single_statement' | 'unified';
  date_from: string | null;
  date_to: string | null;
  included_statement_ids: string[];
}

export interface DashboardMonthCompare {
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

export interface DashboardData {
  statement_id: string;
  institution_name: string;
  statement_type: StatementType;
  period_start: string | null;
  period_end: string | null;
  due_date: string | null;
  payment_due_paisa: number | null;
  minimum_due_paisa: number | null;
  credit_limit_paisa: number | null;
  perceived_spend_paisa: number;
  monthly_income_paisa: number;
  nickname: string | null;
  account_purpose: string | null;
  card_network: string | null;
  transaction_count: number;
  summary: DashboardSummary;
  signals: DashboardSignals;
  advisories: Advisory[];
  scope: DashboardScopeMeta;
  /** True when perceived spend comes from profiles (single monthly baseline), not per-statement. */
  perceived_is_profile_baseline: boolean;
  /** P4-G: `free` retains full access until payment integration; `pro` reserved. */
  plan: UserPlan;
  /** P4-F: scope-aligned current vs previous-period totals. */
  month_compare: DashboardMonthCompare | null;
}

export interface StatementRow {
  id: string;
  institution_name: string;
  statement_type: StatementType;
  period_start: string | null;
  period_end: string | null;
  due_date: string | null;
  payment_due_paisa: number | null;
  minimum_due_paisa: number | null;
  credit_limit_paisa: number | null;
  perceived_spend_paisa: number;
  monthly_income_paisa: number;
  nickname: string | null;
  account_purpose: string | null;
  card_network: string | null;
}

export interface DashboardAggregateRow {
  needs_paisa: number | string | bigint;
  wants_paisa: number | string | bigint;
  investment_paisa: number | string | bigint;
  debt_paisa: number | string | bigint;
  other_paisa: number | string | bigint;
  total_debits_paisa: number | string | bigint;
  total_credits_paisa: number | string | bigint;
  food_delivery_paisa: number | string | bigint;
  subscription_paisa: number | string | bigint;
  transaction_count: number | string | bigint;
  micro_upi_debit_paisa: number | string | bigint;
  micro_upi_debit_count: number | string | bigint;
}

export type DashboardFetchInput =
  | { variant: 'legacy'; statementId: string | null }
  | { variant: 'unified'; dateFrom: string; dateTo: string; statementIds: string[] | null };
