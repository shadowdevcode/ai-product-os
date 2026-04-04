import { getDb } from '@/lib/db';
import { statementMonthLabel } from '@/lib/format-date';
import type { StatementType } from '@/lib/statements';

export interface StatementListItem {
  id: string;
  institution_name: string;
  statement_type: StatementType;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  nickname: string | null;
  account_purpose: string | null;
  card_network: string | null;
}

export async function listProcessedStatements(userId: string): Promise<StatementListItem[]> {
  const sql = getDb();
  const rows = (await sql`
    SELECT
      id,
      institution_name,
      statement_type,
      period_start,
      period_end,
      created_at,
      nickname,
      account_purpose,
      card_network
    FROM statements
    WHERE user_id = ${userId}
      AND status = 'processed'
    ORDER BY period_end DESC NULLS LAST, created_at DESC
  `) as {
    id: string;
    institution_name: string;
    statement_type: StatementType;
    period_start: string | null;
    period_end: string | null;
    created_at: Date | string;
    nickname: string | null;
    account_purpose: string | null;
    card_network: string | null;
  }[];

  return rows.map((r) => ({
    id: r.id,
    institution_name: r.institution_name,
    statement_type: r.statement_type,
    period_start: r.period_start,
    period_end: r.period_end,
    created_at:
      typeof r.created_at === 'string' ? r.created_at : (r.created_at as Date).toISOString(),
    nickname: r.nickname ?? null,
    account_purpose: r.account_purpose ?? null,
    card_network: r.card_network ?? null,
  }));
}

/** Stable label for statement picker */
export function statementPickerLabel(item: StatementListItem): string {
  const nick = item.nickname?.trim();
  const base = nick || item.institution_name;
  const month = statementMonthLabel(item.period_end);
  const type =
    item.statement_type === 'credit_card'
      ? item.card_network
        ? item.card_network
        : 'Card'
      : 'Bank';
  return `${base} · ${type} · ${month}`;
}
