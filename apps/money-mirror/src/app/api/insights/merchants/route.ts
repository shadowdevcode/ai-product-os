/**
 * GET /api/insights/merchants
 *
 * Top merchants by debit spend for the authenticated user, scoped like GET /api/transactions.
 */

import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { ensureProfile, getDb } from '@/lib/db';
import { isUndefinedColumnError, SCHEMA_UPGRADE_HINT } from '@/lib/pg-errors';
import {
  listMerchantRollups,
  MERCHANT_ROLLUPS_MAX_LIMIT,
  sumKeyedDebitPaisa,
  sumScopeDebitPaisa,
  type MerchantRollupParams,
} from '@/lib/merchant-rollups';
import { parseStatementIdsParam } from '@/lib/scope';
import { checkRateLimit } from '@/lib/rate-limit';
import { captureServerEvent } from '@/lib/posthog';

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

const HEAVY_READ_LIMIT = { limit: 40, windowMs: 60_000 };

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(`insights:merchants:get:${user.id}`, HEAVY_READ_LIMIT);
  if (!rate.ok) {
    void captureServerEvent(user.id, 'rate_limit_hit', {
      route: '/api/insights/merchants',
      retry_after_sec: rate.retryAfterSec,
    }).catch(() => {});
    return NextResponse.json(
      { error: 'Too many requests. Please wait before retrying.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
    );
  }

  const sp = req.nextUrl.searchParams;
  const limitRaw = sp.get('limit');
  const limit = Math.min(
    MERCHANT_ROLLUPS_MAX_LIMIT,
    Math.max(1, limitRaw ? Number.parseInt(limitRaw, 10) || 12 : 12)
  );

  const minSpendRaw = sp.get('min_spend_paisa');
  const minDebitPaisa = Math.max(0, minSpendRaw ? Number.parseInt(minSpendRaw, 10) || 0 : 0);

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

  const params: MerchantRollupParams = {
    userId: user.id,
    dateFrom,
    dateTo,
    statementId,
    statementIds: statementIdsList && statementIdsList.length > 0 ? statementIdsList : null,
    minDebitPaisa,
    limit,
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

    const [merchants, scope_total_debit_paisa, keyed_debit_sum] = await Promise.all([
      listMerchantRollups(sql, params),
      sumScopeDebitPaisa(sql, params),
      sumKeyedDebitPaisa(sql, params),
    ]);

    return NextResponse.json({
      merchants,
      scope_total_debit_paisa,
      /** Sum of debits that have a non-null merchant_key (subset of scope_total_debit_paisa). */
      keyed_debit_paisa: keyed_debit_sum,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error('[insights/merchants] GET failed:', e);
    if (isUndefinedColumnError(e)) {
      return NextResponse.json(
        {
          error: "Can't load merchant insights",
          code: 'SCHEMA_DRIFT',
          detail: SCHEMA_UPGRADE_HINT,
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: 'Failed to load merchant insights' }, { status: 500 });
  }
}
