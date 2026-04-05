type SqlClient = ReturnType<typeof import('@/lib/db').getDb>;

export const TRANSACTIONS_MAX_LIMIT = 100;

export type TransactionRow = {
  id: string;
  statement_id: string;
  date: string;
  description: string;
  amount_paisa: number;
  type: 'debit' | 'credit';
  category: string;
  is_recurring: boolean;
  merchant_key: string | null;
  statement_nickname: string | null;
  statement_institution_name: string;
};

export interface ListTransactionsParams {
  userId: string;
  dateFrom: string | null;
  dateTo: string | null;
  statementId: string | null;
  /** When set and non-empty, restricts to these statements (takes precedence over `statementId`). */
  statementIds: string[] | null;
  category: string | null;
  type: 'debit' | 'credit' | null;
  search: string | null;
  merchantKey: string | null;
  limit: number;
  offset: number;
}

export async function countTransactions(
  sql: SqlClient,
  p: ListTransactionsParams
): Promise<number> {
  const useMany = p.statementIds && p.statementIds.length > 0;
  const rows = useMany
    ? await sql`
        SELECT COUNT(*)::bigint AS c
        FROM transactions t
        INNER JOIN statements s ON s.id = t.statement_id AND s.user_id = t.user_id
        WHERE t.user_id = ${p.userId}
          AND (${p.dateFrom}::text IS NULL OR t.date >= ${p.dateFrom}::date)
          AND (${p.dateTo}::text IS NULL OR t.date <= ${p.dateTo}::date)
          AND t.statement_id = ANY(${p.statementIds}::uuid[])
          AND (${p.category}::text IS NULL OR t.category = ${p.category})
          AND (${p.type}::text IS NULL OR t.type = ${p.type})
          AND (${p.search}::text IS NULL OR POSITION(LOWER(${p.search}) IN LOWER(t.description)) > 0)
          AND (${p.merchantKey}::text IS NULL OR t.merchant_key = ${p.merchantKey})
      `
    : p.statementId
      ? await sql`
          SELECT COUNT(*)::bigint AS c
          FROM transactions t
          INNER JOIN statements s ON s.id = t.statement_id AND s.user_id = t.user_id
          WHERE t.user_id = ${p.userId}
            AND (${p.dateFrom}::text IS NULL OR t.date >= ${p.dateFrom}::date)
            AND (${p.dateTo}::text IS NULL OR t.date <= ${p.dateTo}::date)
            AND t.statement_id = ${p.statementId}::uuid
            AND (${p.category}::text IS NULL OR t.category = ${p.category})
            AND (${p.type}::text IS NULL OR t.type = ${p.type})
            AND (${p.search}::text IS NULL OR POSITION(LOWER(${p.search}) IN LOWER(t.description)) > 0)
            AND (${p.merchantKey}::text IS NULL OR t.merchant_key = ${p.merchantKey})
        `
      : await sql`
          SELECT COUNT(*)::bigint AS c
          FROM transactions t
          INNER JOIN statements s ON s.id = t.statement_id AND s.user_id = t.user_id
          WHERE t.user_id = ${p.userId}
            AND (${p.dateFrom}::text IS NULL OR t.date >= ${p.dateFrom}::date)
            AND (${p.dateTo}::text IS NULL OR t.date <= ${p.dateTo}::date)
            AND (${p.category}::text IS NULL OR t.category = ${p.category})
            AND (${p.type}::text IS NULL OR t.type = ${p.type})
            AND (${p.search}::text IS NULL OR POSITION(LOWER(${p.search}) IN LOWER(t.description)) > 0)
            AND (${p.merchantKey}::text IS NULL OR t.merchant_key = ${p.merchantKey})
        `;
  const row = (rows as { c: bigint | string }[])[0];
  return Number(row.c);
}

export async function listTransactions(
  sql: SqlClient,
  p: ListTransactionsParams
): Promise<TransactionRow[]> {
  const useMany = p.statementIds && p.statementIds.length > 0;
  const rows = useMany
    ? ((await sql`
        SELECT
          t.id,
          t.statement_id,
          t.date::text AS date,
          t.description,
          t.amount_paisa,
          t.type,
          t.category,
          t.is_recurring,
          t.merchant_key,
          s.nickname AS statement_nickname,
          s.institution_name AS statement_institution_name
        FROM transactions t
        INNER JOIN statements s ON s.id = t.statement_id AND s.user_id = t.user_id
        WHERE t.user_id = ${p.userId}
          AND (${p.dateFrom}::text IS NULL OR t.date >= ${p.dateFrom}::date)
          AND (${p.dateTo}::text IS NULL OR t.date <= ${p.dateTo}::date)
          AND t.statement_id = ANY(${p.statementIds}::uuid[])
          AND (${p.category}::text IS NULL OR t.category = ${p.category})
          AND (${p.type}::text IS NULL OR t.type = ${p.type})
          AND (${p.search}::text IS NULL OR POSITION(LOWER(${p.search}) IN LOWER(t.description)) > 0)
          AND (${p.merchantKey}::text IS NULL OR t.merchant_key = ${p.merchantKey})
        ORDER BY t.date DESC, t.id DESC
        LIMIT ${p.limit}
        OFFSET ${p.offset}
      `) as unknown as TransactionRow[])
    : p.statementId
      ? ((await sql`
          SELECT
            t.id,
            t.statement_id,
            t.date::text AS date,
            t.description,
            t.amount_paisa,
            t.type,
            t.category,
            t.is_recurring,
            t.merchant_key,
            s.nickname AS statement_nickname,
            s.institution_name AS statement_institution_name
          FROM transactions t
          INNER JOIN statements s ON s.id = t.statement_id AND s.user_id = t.user_id
          WHERE t.user_id = ${p.userId}
            AND (${p.dateFrom}::text IS NULL OR t.date >= ${p.dateFrom}::date)
            AND (${p.dateTo}::text IS NULL OR t.date <= ${p.dateTo}::date)
            AND t.statement_id = ${p.statementId}::uuid
            AND (${p.category}::text IS NULL OR t.category = ${p.category})
            AND (${p.type}::text IS NULL OR t.type = ${p.type})
            AND (${p.search}::text IS NULL OR POSITION(LOWER(${p.search}) IN LOWER(t.description)) > 0)
            AND (${p.merchantKey}::text IS NULL OR t.merchant_key = ${p.merchantKey})
          ORDER BY t.date DESC, t.id DESC
          LIMIT ${p.limit}
          OFFSET ${p.offset}
        `) as unknown as TransactionRow[])
      : ((await sql`
          SELECT
            t.id,
            t.statement_id,
            t.date::text AS date,
            t.description,
            t.amount_paisa,
            t.type,
            t.category,
            t.is_recurring,
            t.merchant_key,
            s.nickname AS statement_nickname,
            s.institution_name AS statement_institution_name
          FROM transactions t
          INNER JOIN statements s ON s.id = t.statement_id AND s.user_id = t.user_id
          WHERE t.user_id = ${p.userId}
            AND (${p.dateFrom}::text IS NULL OR t.date >= ${p.dateFrom}::date)
            AND (${p.dateTo}::text IS NULL OR t.date <= ${p.dateTo}::date)
            AND (${p.category}::text IS NULL OR t.category = ${p.category})
            AND (${p.type}::text IS NULL OR t.type = ${p.type})
            AND (${p.search}::text IS NULL OR POSITION(LOWER(${p.search}) IN LOWER(t.description)) > 0)
            AND (${p.merchantKey}::text IS NULL OR t.merchant_key = ${p.merchantKey})
          ORDER BY t.date DESC, t.id DESC
          LIMIT ${p.limit}
          OFFSET ${p.offset}
        `) as unknown as TransactionRow[]);
  return rows;
}
