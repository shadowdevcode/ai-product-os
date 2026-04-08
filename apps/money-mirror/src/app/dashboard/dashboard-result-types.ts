import type { LayerAFacts } from '@/lib/coaching-facts';
import type { DashboardMonthCompare } from '@/lib/dashboard-types';
import type { StatementType } from '@/lib/statements';
import type { UserPlan } from '@/lib/user-plan';

/** Dashboard API + parse response shape used by DashboardClient */
export interface DashboardResult {
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
  summary: {
    needs_paisa: number;
    wants_paisa: number;
    investment_paisa: number;
    debt_paisa: number;
    other_paisa: number;
    total_debits_paisa: number;
    total_credits_paisa: number;
  };
  scope?: {
    kind: 'single_statement' | 'unified';
    date_from: string | null;
    date_to: string | null;
    included_statement_ids: string[];
  };
  perceived_is_profile_baseline?: boolean;
  /** P4-G: from profiles.plan; omit on partial responses (defaults to free in UI). */
  plan?: UserPlan;
  /** Layer A facts (issue-010 T4); server-built, facts-grounded coaching. */
  coaching_facts?: LayerAFacts;
  /** P4-F: scope-aligned month-over-month totals. */
  month_compare?: DashboardMonthCompare | null;
}
