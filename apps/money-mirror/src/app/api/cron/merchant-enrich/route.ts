/**
 * GET /api/cron/merchant-enrich
 *
 * Batch job: create merchant_label_suggestions for merchant_keys missing suggestions.
 * Auth: same as other crons (Bearer CRON_SECRET or x-cron-secret).
 * Does not block uploads; safe to skip when GEMINI_API_KEY is unset (200 + skipped).
 */

import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { suggestMerchantLabelFromSamples } from '@/lib/merchant-label-enrich';

const MAX_KEYS_PER_RUN = 6;

function isAuthorizedCronRequest(req: NextRequest): boolean {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return false;
  }
  const bearerToken = req.headers.get('authorization');
  if (bearerToken === `Bearer ${expectedSecret}`) {
    return true;
  }
  return req.headers.get('x-cron-secret') === expectedSecret;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'GEMINI_API_KEY unset' });
  }

  const sql = getDb();
  const processed: { user_id: string; merchant_key: string; status: string }[] = [];

  try {
    const candidates = (await sql`
      SELECT DISTINCT ON (t.user_id, t.merchant_key) t.user_id, t.merchant_key
      FROM transactions t
      WHERE t.merchant_key IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM merchant_label_suggestions m
          WHERE m.user_id = t.user_id AND m.merchant_key = t.merchant_key
        )
      ORDER BY t.user_id, t.merchant_key, t.created_at DESC
      LIMIT ${MAX_KEYS_PER_RUN}
    `) as { user_id: string; merchant_key: string }[];

    for (const c of candidates) {
      const samples = (await sql`
        SELECT description
        FROM transactions
        WHERE user_id = ${c.user_id} AND merchant_key = ${c.merchant_key}
        ORDER BY date DESC
        LIMIT 8
      `) as { description: string }[];

      const texts = samples.map((s) => s.description).filter(Boolean);
      const out = await suggestMerchantLabelFromSamples(c.merchant_key, texts);
      if (!out.ok) {
        processed.push({
          user_id: c.user_id,
          merchant_key: c.merchant_key,
          status: out.code,
        });
        continue;
      }

      await sql`
        INSERT INTO merchant_label_suggestions (
          user_id,
          merchant_key,
          suggested_label,
          confidence,
          source,
          model,
          created_at
        )
        VALUES (
          ${c.user_id},
          ${c.merchant_key},
          ${out.suggested_label},
          ${out.confidence},
          'gemini',
          'gemini-2.5-flash',
          timezone('utc', now())
        )
        ON CONFLICT (user_id, merchant_key) DO UPDATE SET
          suggested_label = EXCLUDED.suggested_label,
          confidence = EXCLUDED.confidence,
          model = EXCLUDED.model,
          created_at = timezone('utc', now())
      `;

      processed.push({
        user_id: c.user_id,
        merchant_key: c.merchant_key,
        status: 'ok',
      });
    }

    return NextResponse.json({ ok: true, processed });
  } catch (e) {
    Sentry.captureException(e);
    console.error('[cron/merchant-enrich] failed:', e);
    return NextResponse.json({ error: 'merchant-enrich failed' }, { status: 500 });
  }
}
