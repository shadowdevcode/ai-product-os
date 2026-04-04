import { randomUUID } from 'node:crypto';
import { getDb, getProfileFinancialSnapshot } from '@/lib/db';
import { captureServerEvent } from '@/lib/posthog';
import type { StatementType } from '@/lib/statements';

interface CategorizedTransaction {
  date: string;
  description: string;
  amount_paisa: number;
  type: 'debit' | 'credit';
  category: string;
  is_recurring: boolean;
}

interface StatementSummary {
  total_debits: number;
  total_credits: number;
  needs: number;
  wants: number;
  investment: number;
  debt: number;
  other: number;
}

interface PeriodInfo {
  institution_name: string;
  statement_type: StatementType;
  period_start: string;
  period_end: string;
  due_date: string | null;
  payment_due_paisa: number | null;
  minimum_due_paisa: number | null;
  credit_limit_paisa: number | null;
  nickname?: string | null;
  account_purpose?: string | null;
  card_network?: string | null;
}

interface PersistResult {
  statement_id: string;
  error?: string;
}

/**
 * Persists a parsed statement and its transactions to Neon Postgres.
 * Returns the statement ID on success, or an error string on failure.
 * Uses a single transaction so partial writes are rolled back.
 */
export async function persistStatement(
  userId: string,
  categorized: CategorizedTransaction[],
  summary: StatementSummary,
  period: PeriodInfo
): Promise<PersistResult> {
  const sql = getDb();
  const statementId = randomUUID();

  try {
    const profile = await getProfileFinancialSnapshot(userId);
    const transactionQueries = categorized.map(
      (tx) =>
        sql`
        INSERT INTO transactions (
          id,
          statement_id,
          user_id,
          date,
          description,
          amount_paisa,
          type,
          category,
          is_recurring
        )
        VALUES (
          ${randomUUID()},
          ${statementId},
          ${userId},
          ${tx.date}::date,
          ${tx.description},
          ${tx.amount_paisa},
          ${tx.type},
          ${tx.category},
          ${tx.is_recurring}
        )
      `
    );

    await sql.transaction([
      sql`
        INSERT INTO statements (
          id,
          user_id,
          bank_name,
          institution_name,
          statement_type,
          period_start,
          period_end,
          due_date,
          total_debits_paisa,
          total_credits_paisa,
          perceived_spend_paisa,
          payment_due_paisa,
          minimum_due_paisa,
          credit_limit_paisa,
          nickname,
          account_purpose,
          card_network,
          status
        )
        VALUES (
          ${statementId},
          ${userId},
          ${period.institution_name},
          ${period.institution_name},
          ${period.statement_type},
          ${period.period_start}::date,
          ${period.period_end}::date,
          ${period.due_date}::date,
          ${summary.total_debits},
          ${summary.total_credits},
          ${profile.perceived_spend_paisa},
          ${period.payment_due_paisa},
          ${period.minimum_due_paisa},
          ${period.credit_limit_paisa},
          ${period.nickname ?? null},
          ${period.account_purpose ?? null},
          ${period.card_network ?? null},
          'processing'
        )
      `,
      ...transactionQueries,
      sql`
        UPDATE statements
        SET status = 'processed'
        WHERE id = ${statementId}
          AND user_id = ${userId}
      `,
    ]);
  } catch (error) {
    await captureServerEvent(userId, 'statement_parse_failed', {
      error_type: 'DB_TRANSACTION_FAILED',
    });
    console.error('[persist-statement] transaction failed:', error);
    return { statement_id: '', error: 'Failed to save statement data.' };
  }

  return { statement_id: statementId };
}
