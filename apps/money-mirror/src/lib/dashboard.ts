import { generateAdvisories, type Advisory } from '@/lib/advisory-engine';
import type { CategorySummary } from '@/lib/categorizer';
import { getDb, toNumber } from '@/lib/db';

const FOOD_REGEX =
  /\b(swiggy|zomato|eatsure|dunzo|barbeque|starbucks|cafe|restaurant|food|pizza|burger|kfc|mcdonald|domino)\b/i;
const SUBSCRIPTION_REGEX =
  /\b(netflix|hotstar|prime|spotify|youtube premium|jiocinema|zee5|sonyliv|subscription|gym|membership)\b/i;

export interface DashboardSummary {
  needs_paisa: number;
  wants_paisa: number;
  investment_paisa: number;
  debt_paisa: number;
  other_paisa: number;
  total_debits_paisa: number;
  total_credits_paisa: number;
}

export interface DashboardData {
  statement_id: string;
  period_start: string | null;
  period_end: string | null;
  transaction_count: number;
  summary: DashboardSummary;
  advisories: Advisory[];
}

interface StatementRow {
  id: string;
  period_start: string | null;
  period_end: string | null;
  perceived_spend_paisa: number;
}

interface TransactionRow {
  category: string;
  amount_paisa: number;
  type: 'debit' | 'credit';
  description: string;
  is_recurring: boolean;
}

export async function fetchDashboardData(
  userId: string,
  statementId: string | null
): Promise<DashboardData | null> {
  const sql = getDb();

  const statementRows = statementId
    ? ((await sql`
        SELECT id, period_start, period_end, perceived_spend_paisa
        FROM statements
        WHERE user_id = ${userId}
          AND status = 'processed'
          AND id = ${statementId}
        LIMIT 1
      `) as {
        id: string;
        period_start: string | null;
        period_end: string | null;
        perceived_spend_paisa: number | string | bigint;
      }[])
    : ((await sql`
        SELECT id, period_start, period_end, perceived_spend_paisa
        FROM statements
        WHERE user_id = ${userId}
          AND status = 'processed'
        ORDER BY created_at DESC
        LIMIT 1
      `) as {
        id: string;
        period_start: string | null;
        period_end: string | null;
        perceived_spend_paisa: number | string | bigint;
      }[]);

  const row = statementRows[0];
  if (!row) {
    return null;
  }

  const statement: StatementRow = {
    id: row.id,
    period_start: row.period_start,
    period_end: row.period_end,
    perceived_spend_paisa: toNumber(row.perceived_spend_paisa),
  };

  const transactionRows = (await sql`
    SELECT category, amount_paisa, type, description, is_recurring
    FROM transactions
    WHERE statement_id = ${statement.id}
      AND user_id = ${userId}
    ORDER BY date DESC
    LIMIT 1000
  `) as {
    category: string;
    amount_paisa: number | string | bigint;
    type: 'debit' | 'credit';
    description: string;
    is_recurring: boolean;
  }[];

  const transactions: TransactionRow[] = transactionRows.map((transactionRow) => ({
    category: transactionRow.category,
    amount_paisa: toNumber(transactionRow.amount_paisa),
    type: transactionRow.type,
    description: transactionRow.description,
    is_recurring: transactionRow.is_recurring,
  }));

  const summary = buildDashboardSummary(transactions);
  const advisories = buildAdvisories(summary, statement.perceived_spend_paisa, transactions);

  return {
    statement_id: statement.id,
    period_start: statement.period_start,
    period_end: statement.period_end,
    transaction_count: transactions.length,
    summary,
    advisories,
  };
}

function buildDashboardSummary(transactions: TransactionRow[]): DashboardSummary {
  const summary: CategorySummary = {
    needs: 0,
    wants: 0,
    investment: 0,
    debt: 0,
    other: 0,
    total_debits: 0,
    total_credits: 0,
  };

  for (const tx of transactions) {
    if (tx.type === 'credit') {
      summary.total_credits += tx.amount_paisa;
      continue;
    }

    summary.total_debits += tx.amount_paisa;

    if (tx.category === 'needs') {
      summary.needs += tx.amount_paisa;
      continue;
    }
    if (tx.category === 'wants') {
      summary.wants += tx.amount_paisa;
      continue;
    }
    if (tx.category === 'investment') {
      summary.investment += tx.amount_paisa;
      continue;
    }
    if (tx.category === 'debt') {
      summary.debt += tx.amount_paisa;
      continue;
    }

    summary.other += tx.amount_paisa;
  }

  return {
    needs_paisa: summary.needs,
    wants_paisa: summary.wants,
    investment_paisa: summary.investment,
    debt_paisa: summary.debt,
    other_paisa: summary.other,
    total_debits_paisa: summary.total_debits,
    total_credits_paisa: summary.total_credits,
  };
}

function buildAdvisories(
  summary: DashboardSummary,
  perceivedSpendPaisa: number,
  transactions: TransactionRow[]
): Advisory[] {
  let foodDeliveryPaisa = 0;
  let subscriptionPaisa = 0;

  for (const tx of transactions) {
    if (tx.type !== 'debit') {
      continue;
    }

    if (FOOD_REGEX.test(tx.description)) {
      foodDeliveryPaisa += tx.amount_paisa;
    }
    if (SUBSCRIPTION_REGEX.test(tx.description)) {
      subscriptionPaisa += tx.amount_paisa;
    }
  }

  return generateAdvisories({
    summary: {
      needs: summary.needs_paisa,
      wants: summary.wants_paisa,
      investment: summary.investment_paisa,
      debt: summary.debt_paisa,
      other: summary.other_paisa,
      total_debits: summary.total_debits_paisa,
      total_credits: summary.total_credits_paisa,
    },
    perceived_spend_paisa: perceivedSpendPaisa,
    monthly_income_paisa: summary.total_credits_paisa,
    food_delivery_paisa: foodDeliveryPaisa,
    subscription_paisa: subscriptionPaisa,
  });
}
