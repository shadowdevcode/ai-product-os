/**
 * POST /api/transactions/backfill-merchant-keys
 *
 * One-time per-user backfill of merchant_key for rows where it is null.
 */

import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { normalizeMerchantKey } from '@/lib/merchant-normalize';

const BATCH = 500;

export async function POST(): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = getDb();
  let updated = 0;
  let cursor: string | null = null;

  try {
    for (;;) {
      const rows =
        cursor === null
          ? await sql`
              SELECT id, description
              FROM transactions
              WHERE user_id = ${user.id}
                AND merchant_key IS NULL
              ORDER BY id ASC
              LIMIT ${BATCH}
            `
          : await sql`
              SELECT id, description
              FROM transactions
              WHERE user_id = ${user.id}
                AND merchant_key IS NULL
                AND id > ${cursor}::uuid
              ORDER BY id ASC
              LIMIT ${BATCH}
            `;
      const batch = rows as { id: string; description: string }[];
      if (batch.length === 0) {
        break;
      }

      // Accumulate normalizable pairs, then batch UPDATE in one round-trip
      const ids: string[] = [];
      const keys: string[] = [];
      for (const row of batch) {
        const key = normalizeMerchantKey(row.description);
        if (key !== null) {
          ids.push(row.id);
          keys.push(key);
        }
      }

      if (ids.length > 0) {
        await sql`
          UPDATE transactions
          SET merchant_key = data.key
          FROM unnest(${ids}::uuid[], ${keys}::text[]) AS data(id, key)
          WHERE transactions.id = data.id
            AND transactions.user_id = ${user.id}
        `;
        updated += ids.length;
      }

      cursor = batch[batch.length - 1]?.id ?? null;
    }

    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    Sentry.captureException(e);
    console.error('[backfill-merchant-keys] failed:', e);
    return NextResponse.json({ error: 'Backfill failed' }, { status: 500 });
  }
}
