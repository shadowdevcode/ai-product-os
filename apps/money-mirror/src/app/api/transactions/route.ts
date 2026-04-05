/**
 * GET /api/transactions
 *
 * Paginated transactions for the authenticated user. Single emission source for
 * `transactions_filter_applied` when any filter beyond pagination is active (server-side).
 */

import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { ensureProfile, getDb } from '@/lib/db';
import { captureServerEvent } from '@/lib/posthog';
import {
  TRANSACTIONS_MAX_LIMIT,
  countTransactions,
  listTransactions,
  type ListTransactionsParams,
} from '@/lib/transactions-list';
import { parseStatementIdsParam } from '@/lib/scope';

const CATEGORIES = new Set(['needs', 'wants', 'investment', 'debt', 'other']);
const TYPES = new Set(['debit', 'credit']);

function parseDateOnly(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return 'invalid';
  }
  const d = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    return 'invalid';
  }
  return raw;
}

function parseUuid(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)) {
    return 'invalid';
  }
  return raw;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const limitRaw = sp.get('limit');
  const offsetRaw = sp.get('offset');
  const limit = Math.min(
    TRANSACTIONS_MAX_LIMIT,
    Math.max(1, limitRaw ? Number.parseInt(limitRaw, 10) || 50 : 50)
  );
  const offset = Math.max(0, offsetRaw ? Number.parseInt(offsetRaw, 10) || 0 : 0);

  const dateFrom = parseDateOnly(sp.get('date_from'));
  const dateTo = parseDateOnly(sp.get('date_to'));
  if (dateFrom === 'invalid' || dateTo === 'invalid') {
    return NextResponse.json(
      { error: 'Invalid date_from or date_to (use YYYY-MM-DD).' },
      { status: 400 }
    );
  }

  let statementId = parseUuid(sp.get('statement_id'));
  if (statementId === 'invalid') {
    return NextResponse.json({ error: 'Invalid statement_id.' }, { status: 400 });
  }

  const idsParsed = parseStatementIdsParam(sp.get('statement_ids'));
  if (!idsParsed.ok) {
    return NextResponse.json({ error: idsParsed.error }, { status: 400 });
  }
  const statementIdsList = idsParsed.value;
  if (statementIdsList && statementIdsList.length > 0) {
    statementId = null;
  }

  const category = sp.get('category');
  if (category && !CATEGORIES.has(category)) {
    return NextResponse.json({ error: 'Invalid category.' }, { status: 400 });
  }

  const type = sp.get('type') as 'debit' | 'credit' | null;
  if (type && !TYPES.has(type)) {
    return NextResponse.json({ error: 'Invalid type.' }, { status: 400 });
  }

  let search = sp.get('search')?.trim() ?? null;
  if (search && search.length > 200) {
    return NextResponse.json({ error: 'search must be at most 200 characters.' }, { status: 400 });
  }
  if (search === '') {
    search = null;
  }

  const merchantKeyRaw = sp.get('merchant_key')?.trim() ?? null;
  if (merchantKeyRaw && merchantKeyRaw.length > 128) {
    return NextResponse.json({ error: 'Invalid merchant_key.' }, { status: 400 });
  }
  const merchantKey = merchantKeyRaw || null;

  const params: ListTransactionsParams = {
    userId: user.id,
    dateFrom,
    dateTo,
    statementId,
    statementIds: statementIdsList && statementIdsList.length > 0 ? statementIdsList : null,
    category: category || null,
    type: type || null,
    search,
    merchantKey,
    limit,
    offset,
  };

  try {
    await ensureProfile({ id: user.id, email: user.email });
    const sql = getDb();

    if (params.statementIds && params.statementIds.length > 0) {
      const owned = (await sql`
        SELECT id
        FROM statements
        WHERE user_id = ${user.id}
          AND id = ANY(${params.statementIds}::uuid[])
      `) as { id: string }[];
      if (owned.length !== params.statementIds.length) {
        return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
      }
    } else if (statementId) {
      const ownsRows = await sql`
        SELECT 1 AS ok
        FROM statements
        WHERE id = ${statementId}::uuid
          AND user_id = ${user.id}
        LIMIT 1
      `;
      const owns = (ownsRows as { ok: number }[])[0];
      if (!owns) {
        return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
      }
    }

    const [total, transactions] = await Promise.all([
      countTransactions(sql, params),
      listTransactions(sql, params),
    ]);

    const hasFilters = Boolean(
      dateFrom ||
      dateTo ||
      statementId ||
      (params.statementIds && params.statementIds.length > 0) ||
      category ||
      type ||
      search ||
      merchantKey
    );
    if (hasFilters) {
      const filterTypes: string[] = [];
      if (dateFrom || dateTo) {
        filterTypes.push('date_range');
      }
      if (params.statementIds && params.statementIds.length > 0) {
        filterTypes.push('statement_ids');
      } else if (statementId) {
        filterTypes.push('statement_id');
      }
      if (category) {
        filterTypes.push('category');
      }
      if (type) {
        filterTypes.push('type');
      }
      if (search) {
        filterTypes.push('search');
      }
      if (merchantKey) {
        filterTypes.push('merchant_key');
      }
      void captureServerEvent(user.id, 'transactions_filter_applied', {
        filter_types: filterTypes,
        scope:
          params.statementIds && params.statementIds.length > 1
            ? 'multi_statement'
            : statementId || (params.statementIds && params.statementIds.length === 1)
              ? 'statement'
              : 'all',
      }).catch(() => {});
    }

    return NextResponse.json({
      transactions,
      total,
      limit,
      offset,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error('[transactions] GET failed:', e);
    return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 });
  }
}
