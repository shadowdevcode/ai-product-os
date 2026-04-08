import { toNumber } from '@/lib/db';
import { formatMerchantKeyForDisplay } from '@/lib/merchant-normalize';

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
  /** Resolved label: user alias, else formatted merchant_key. */
  display_label: string;
  debit_paisa: number;
  txn_count: number;
  suggested_label: string | null;
  suggestion_confidence: number | null;
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
          COUNT(*)::bigint AS txn_count,
          MAX(u.display_label) AS alias_label,
          MAX(mls.suggested_label) AS suggested_label,
          MAX(mls.confidence) AS suggestion_confidence
        FROM transactions t
        INNER JOIN statements s ON s.id = t.statement_id AND s.user_id = t.user_id
        LEFT JOIN user_merchant_aliases u ON u.user_id = t.user_id AND u.merchant_key = t.merchant_key
        LEFT JOIN merchant_label_suggestions mls
          ON mls.user_id = t.user_id AND mls.merchant_key = t.merchant_key
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
      `) as {
        merchant_key: string;
        debit_paisa: bigint | string;
        txn_count: bigint | string;
        alias_label: string | null;
        suggested_label: string | null;
        suggestion_confidence: string | number | null;
      }[])
    : p.statementId
      ? ((await sql`
          SELECT
            t.merchant_key,
            SUM(t.amount_paisa)::bigint AS debit_paisa,
            COUNT(*)::bigint AS txn_count,
            MAX(u.display_label) AS alias_label,
            MAX(mls.suggested_label) AS suggested_label,
            MAX(mls.confidence) AS suggestion_confidence
          FROM transactions t
          INNER JOIN statements s ON s.id = t.statement_id AND s.user_id = t.user_id
          LEFT JOIN user_merchant_aliases u ON u.user_id = t.user_id AND u.merchant_key = t.merchant_key
          LEFT JOIN merchant_label_suggestions mls
            ON mls.user_id = t.user_id AND mls.merchant_key = t.merchant_key
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
        `) as {
          merchant_key: string;
          debit_paisa: bigint | string;
          txn_count: bigint | string;
          alias_label: string | null;
          suggested_label: string | null;
          suggestion_confidence: string | number | null;
        }[])
      : ((await sql`
          SELECT
            t.merchant_key,
            SUM(t.amount_paisa)::bigint AS debit_paisa,
            COUNT(*)::bigint AS txn_count,
            MAX(u.display_label) AS alias_label,
            MAX(mls.suggested_label) AS suggested_label,
            MAX(mls.confidence) AS suggestion_confidence
          FROM transactions t
          INNER JOIN statements s ON s.id = t.statement_id AND s.user_id = t.user_id
          LEFT JOIN user_merchant_aliases u ON u.user_id = t.user_id AND u.merchant_key = t.merchant_key
          LEFT JOIN merchant_label_suggestions mls
            ON mls.user_id = t.user_id AND mls.merchant_key = t.merchant_key
          WHERE t.user_id = ${p.userId}
            AND t.type = 'debit'
            AND t.merchant_key IS NOT NULL
            AND (${p.dateFrom}::text IS NULL OR t.date >= ${p.dateFrom}::date)
            AND (${p.dateTo}::text IS NULL OR t.date <= ${p.dateTo}::date)
          GROUP BY t.merchant_key
          HAVING SUM(t.amount_paisa) >= ${p.minDebitPaisa}
          ORDER BY debit_paisa DESC
          LIMIT ${p.limit}
        `) as {
          merchant_key: string;
          debit_paisa: bigint | string;
          txn_count: bigint | string;
          alias_label: string | null;
          suggested_label: string | null;
          suggestion_confidence: string | number | null;
        }[]);

  return rows.map((r) => {
    const conf = r.suggestion_confidence;
    const suggestionConfidence = conf === null || conf === undefined ? null : Number(conf);
    return {
      merchant_key: r.merchant_key,
      display_label: r.alias_label?.trim()
        ? r.alias_label.trim()
        : formatMerchantKeyForDisplay(r.merchant_key),
      debit_paisa: toNumber(r.debit_paisa),
      txn_count: toNumber(r.txn_count),
      suggested_label: r.suggested_label?.trim() ? r.suggested_label.trim() : null,
      suggestion_confidence:
        suggestionConfidence !== null && !Number.isNaN(suggestionConfidence)
          ? suggestionConfidence
          : null,
    };
  });
}

/**
 * Shared internal for sumScopeDebitPaisa / sumKeyedDebitPaisa.
 * keyedOnly=true adds `AND t.merchant_key IS NOT NULL` to every branch.
 */
async function sumDebitPaisaInternal(
  sql: SqlClient,
  p: MerchantRollupParams,
  keyedOnly: boolean
): Promise<number> {
  const useMany = p.statementIds && p.statementIds.length > 0;
  const rows: { s: bigint | string }[] = useMany
    ? keyedOnly
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
      : ((await sql`
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
      ? keyedOnly
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
              AND (${p.dateFrom}::text IS NULL OR t.date >= ${p.dateFrom}::date)
              AND (${p.dateTo}::text IS NULL OR t.date <= ${p.dateTo}::date)
              AND t.statement_id = ${p.statementId}::uuid
          `) as { s: bigint | string }[])
      : keyedOnly
        ? ((await sql`
            SELECT COALESCE(SUM(t.amount_paisa), 0)::bigint AS s
            FROM transactions t
            INNER JOIN statements s ON s.id = t.statement_id AND s.user_id = t.user_id
            WHERE t.user_id = ${p.userId}
              AND t.type = 'debit'
              AND t.merchant_key IS NOT NULL
              AND (${p.dateFrom}::text IS NULL OR t.date >= ${p.dateFrom}::date)
              AND (${p.dateTo}::text IS NULL OR t.date <= ${p.dateTo}::date)
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

/**
 * Total debit paisa in scope (all debits, including rows without merchant_key).
 * Used for reconciliation checks against grouped merchant sums.
 */
export async function sumScopeDebitPaisa(sql: SqlClient, p: MerchantRollupParams): Promise<number> {
  return sumDebitPaisaInternal(sql, p, false);
}

/** Sum of debit paisa where merchant_key is set (subset of total debits). */
export async function sumKeyedDebitPaisa(sql: SqlClient, p: MerchantRollupParams): Promise<number> {
  return sumDebitPaisaInternal(sql, p, true);
}
