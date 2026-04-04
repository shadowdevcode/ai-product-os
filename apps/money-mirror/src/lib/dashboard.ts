import { generateAdvisories, type Advisory } from '@/lib/advisory-engine';
import type { CategorySummary } from '@/lib/categorizer';
import { getDb, toNumber } from '@/lib/db';
import type { StatementType } from '@/lib/statements';

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
  advisories: Advisory[];
}

interface StatementRow {
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
        SELECT s.id, s.institution_name, s.statement_type, s.period_start, s.period_end, s.due_date, s.payment_due_paisa, s.minimum_due_paisa, s.credit_limit_paisa, s.perceived_spend_paisa, p.monthly_income_paisa, s.nickname, s.account_purpose, s.card_network
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
        perceived_spend_paisa: number | string | bigint;
        monthly_income_paisa: number | string | bigint | null;
        nickname: string | null;
        account_purpose: string | null;
        card_network: string | null;
      }[])
    : ((await sql`
        SELECT s.id, s.institution_name, s.statement_type, s.period_start, s.period_end, s.due_date, s.payment_due_paisa, s.minimum_due_paisa, s.credit_limit_paisa, s.perceived_spend_paisa, p.monthly_income_paisa, s.nickname, s.account_purpose, s.card_network
        FROM statements s
        LEFT JOIN profiles p ON p.id = s.user_id
        WHERE s.user_id = ${userId}
          AND s.status = 'processed'
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
        perceived_spend_paisa: number | string | bigint;
        monthly_income_paisa: number | string | bigint | null;
        nickname: string | null;
        account_purpose: string | null;
        card_network: string | null;
      }[]);

  const row = statementRows[0];
  if (!row) {
    return null;
  }

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
    perceived_spend_paisa: toNumber(row.perceived_spend_paisa),
    monthly_income_paisa:
      row.monthly_income_paisa === null ? 0 : toNumber(row.monthly_income_paisa),
    nickname: row.nickname ?? null,
    account_purpose: row.account_purpose ?? null,
    card_network: row.card_network ?? null,
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
  const advisories = buildAdvisories(summary, statement, transactions);

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
  statement: StatementRow,
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
    food_delivery_paisa: foodDeliveryPaisa,
    subscription_paisa: subscriptionPaisa,
    payment_due_paisa: statement.payment_due_paisa,
    minimum_due_paisa: statement.minimum_due_paisa,
  });
}
