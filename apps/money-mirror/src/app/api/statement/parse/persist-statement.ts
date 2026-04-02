import { randomUUID } from 'node:crypto';
import { getDb, getPerceivedSpendPaisa } from '@/lib/db';
import { captureServerEvent } from '@/lib/posthog';

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
  period_start: string;
  period_end: string;
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
    const perceivedSpendPaisa = await getPerceivedSpendPaisa(userId);
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
          period_start,
          period_end,
          total_debits_paisa,
          total_credits_paisa,
          perceived_spend_paisa,
          status
        )
        VALUES (
          ${statementId},
          ${userId},
          ${period.period_start}::date,
          ${period.period_end}::date,
          ${summary.total_debits},
          ${summary.total_credits},
          ${perceivedSpendPaisa},
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
