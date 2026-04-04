import type { StatementType } from '@/lib/statements';

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
}
