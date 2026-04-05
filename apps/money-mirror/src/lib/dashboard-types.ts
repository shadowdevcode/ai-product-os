import type { Advisory } from '@/lib/advisory-engine';
import type { StatementType } from '@/lib/statements';

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
}

export interface DashboardScopeMeta {
  kind: 'single_statement' | 'unified';
  date_from: string | null;
  date_to: string | null;
  included_statement_ids: string[];
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
}

export type DashboardFetchInput =
  | { variant: 'legacy'; statementId: string | null }
  | { variant: 'unified'; dateFrom: string; dateTo: string; statementIds: string[] | null };
