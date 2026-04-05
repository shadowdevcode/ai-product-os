import { toNumber } from '@/lib/db';

type SqlClient = ReturnType<typeof import('@/lib/db').getDb>;

export const MERCHANT_ROLLUPS_MAX_LIMIT = 50;

export type MerchantRollupParams = {
  userId: string;
  dateFrom: string | null;
  dateTo: string | null;
  statementId: string | null;
  statementIds: string[] | null;
  /** Minimum total debit paisa for a merchant row (inclusive). */
  minDebitPaisa: number;
  limit: number;
};

export type MerchantRollupRow = {
  merchant_key: string;
  debit_paisa: number;
  txn_count: number;
};

/**
 * Top merchants by debit spend for the same scope as GET /api/transactions.
 * Only debits with non-null `merchant_key` are included.
 */
export async function listMerchantRollups(
  sql: SqlClient,
  p: MerchantRollupParams
): Promise<MerchantRollupRow[]> {
  const useMany = p.statementIds && p.statementIds.length > 0;
  const rows = useMany
    ? ((await sql`
        SELECT
          t.merchant_key,
          SUM(t.amount_paisa)::bigint AS debit_paisa,
          COUNT(*)::bigint AS txn_count
        FROM transactions t
        INNER JOIN statements s ON s.id = t.statement_id AND s.user_id = t.user_id
        WHERE t.user_id = ${p.userId}
          AND t.type = 'debit'
          AND t.merchant_key IS NOT NULL
          AND (${p.dateFrom}::text IS NULL OR t.date >= ${p.dateFrom}::date)
          AND (${p.dateTo}::text IS NULL OR t.date <= ${p.dateTo}::date)
          AND t.statement_id = ANY(${p.statementIds}::uuid[])
        GROUP BY t.merchant_key
        HAVING SUM(t.amount_paisa) >= ${p.minDebitPaisa}
        ORDER BY debit_paisa DESC
        LIMIT ${p.limit}
      `) as { merchant_key: string; debit_paisa: bigint | string; txn_count: bigint | string }[])
    : p.statementId
      ? ((await sql`
          SELECT
            t.merchant_key,
            SUM(t.amount_paisa)::bigint AS debit_paisa,
            COUNT(*)::bigint AS txn_count
          FROM transactions t
          INNER JOIN statements s ON s.id = t.statement_id AND s.user_id = t.user_id
          WHERE t.user_id = ${p.userId}
            AND t.type = 'debit'
            AND t.merchant_key IS NOT NULL
            AND (${p.dateFrom}::text IS NULL OR t.date >= ${p.dateFrom}::date)
            AND (${p.dateTo}::text IS NULL OR t.date <= ${p.dateTo}::date)
            AND t.statement_id = ${p.statementId}::uuid
          GROUP BY t.merchant_key
          HAVING SUM(t.amount_paisa) >= ${p.minDebitPaisa}
          ORDER BY debit_paisa DESC
          LIMIT ${p.limit}
        `) as { merchant_key: string; debit_paisa: bigint | string; txn_count: bigint | string }[])
      : ((await sql`
          SELECT
            t.merchant_key,
            SUM(t.amount_paisa)::bigint AS debit_paisa,
            COUNT(*)::bigint AS txn_count
          FROM transactions t
          INNER JOIN statements s ON s.id = t.statement_id AND s.user_id = t.user_id
          WHERE t.user_id = ${p.userId}
            AND t.type = 'debit'
            AND t.merchant_key IS NOT NULL
            AND (${p.dateFrom}::text IS NULL OR t.date >= ${p.dateFrom}::date)
            AND (${p.dateTo}::text IS NULL OR t.date <= ${p.dateTo}::date)
          GROUP BY t.merchant_key
          HAVING SUM(t.amount_paisa) >= ${p.minDebitPaisa}
          ORDER BY debit_paisa DESC
          LIMIT ${p.limit}
        `) as { merchant_key: string; debit_paisa: bigint | string; txn_count: bigint | string }[]);

  return rows.map((r) => ({
    merchant_key: r.merchant_key,
    debit_paisa: toNumber(r.debit_paisa),
    txn_count: toNumber(r.txn_count),
  }));
}

/**
 * Total debit paisa in scope (all debits, including rows without merchant_key).
 * Used for reconciliation checks against grouped merchant sums.
 */
export async function sumScopeDebitPaisa(sql: SqlClient, p: MerchantRollupParams): Promise<number> {
  const useMany = p.statementIds && p.statementIds.length > 0;
  const rows = useMany
    ? ((await sql`
        SELECT COALESCE(SUM(t.amount_paisa), 0)::bigint AS s
        FROM transactions t
        INNER JOIN statements s ON s.id = t.statement_id AND s.user_id = t.user_id
        WHERE t.user_id = ${p.userId}
          AND t.type = 'debit'
          AND (${p.dateFrom}::text IS NULL OR t.date >= ${p.dateFrom}::date)
          AND (${p.dateTo}::text IS NULL OR t.date <= ${p.dateTo}::date)
          AND t.statement_id = ANY(${p.statementIds}::uuid[])
      `) as { s: bigint | string }[])
    : p.statementId
      ? ((await sql`
          SELECT COALESCE(SUM(t.amount_paisa), 0)::bigint AS s
          FROM transactions t
          INNER JOIN statements s ON s.id = t.statement_id AND s.user_id = t.user_id
          WHERE t.user_id = ${p.userId}
            AND t.type = 'debit'
            AND (${p.dateFrom}::text IS NULL OR t.date >= ${p.dateFrom}::date)
            AND (${p.dateTo}::text IS NULL OR t.date <= ${p.dateTo}::date)
            AND t.statement_id = ${p.statementId}::uuid
        `) as { s: bigint | string }[])
      : ((await sql`
          SELECT COALESCE(SUM(t.amount_paisa), 0)::bigint AS s
          FROM transactions t
          INNER JOIN statements s ON s.id = t.statement_id AND s.user_id = t.user_id
          WHERE t.user_id = ${p.userId}
            AND t.type = 'debit'
            AND (${p.dateFrom}::text IS NULL OR t.date >= ${p.dateFrom}::date)
            AND (${p.dateTo}::text IS NULL OR t.date <= ${p.dateTo}::date)
        `) as { s: bigint | string }[]);
  const row = rows[0];
  return row ? toNumber(row.s) : 0;
}

/** Sum of debit paisa where merchant_key is set (subset of total debits). */
export async function sumKeyedDebitPaisa(sql: SqlClient, p: MerchantRollupParams): Promise<number> {
  const useMany = p.statementIds && p.statementIds.length > 0;
  const rows = useMany
    ? ((await sql`
        SELECT COALESCE(SUM(t.amount_paisa), 0)::bigint AS s
        FROM transactions t
        INNER JOIN statements s ON s.id = t.statement_id AND s.user_id = t.user_id
        WHERE t.user_id = ${p.userId}
          AND t.type = 'debit'
          AND t.merchant_key IS NOT NULL
          AND (${p.dateFrom}::text IS NULL OR t.date >= ${p.dateFrom}::date)
          AND (${p.dateTo}::text IS NULL OR t.date <= ${p.dateTo}::date)
          AND t.statement_id = ANY(${p.statementIds}::uuid[])
      `) as { s: bigint | string }[])
    : p.statementId
      ? ((await sql`
          SELECT COALESCE(SUM(t.amount_paisa), 0)::bigint AS s
          FROM transactions t
          INNER JOIN statements s ON s.id = t.statement_id AND s.user_id = t.user_id
          WHERE t.user_id = ${p.userId}
            AND t.type = 'debit'
            AND t.merchant_key IS NOT NULL
            AND (${p.dateFrom}::text IS NULL OR t.date >= ${p.dateFrom}::date)
            AND (${p.dateTo}::text IS NULL OR t.date <= ${p.dateTo}::date)
            AND t.statement_id = ${p.statementId}::uuid
        `) as { s: bigint | string }[])
      : ((await sql`
          SELECT COALESCE(SUM(t.amount_paisa), 0)::bigint AS s
          FROM transactions t
          INNER JOIN statements s ON s.id = t.statement_id AND s.user_id = t.user_id
          WHERE t.user_id = ${p.userId}
            AND t.type = 'debit'
            AND t.merchant_key IS NOT NULL
            AND (${p.dateFrom}::text IS NULL OR t.date >= ${p.dateFrom}::date)
            AND (${p.dateTo}::text IS NULL OR t.date <= ${p.dateTo}::date)
        `) as { s: bigint | string }[]);
  const row = rows[0];
  return row ? toNumber(row.s) : 0;
}
