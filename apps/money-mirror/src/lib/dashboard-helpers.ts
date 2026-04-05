import { generateAdvisories, type Advisory } from '@/lib/advisory-engine';
import { toNumber } from '@/lib/db';
import type {
  DashboardAggregateRow,
  DashboardSignals,
  DashboardSummary,
  StatementRow,
} from '@/lib/dashboard-types';

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

export function computeDebitSignals(aggregate: DashboardAggregateRow): DashboardSignals {
  return {
    food_delivery_paisa: toNumber(aggregate.food_delivery_paisa),
    subscription_paisa: toNumber(aggregate.subscription_paisa),
  };
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
  });
}
