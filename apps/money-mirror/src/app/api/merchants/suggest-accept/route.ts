/**
 * POST /api/merchants/suggest-accept
 *
 * Applies a stored Gemini suggestion as the user’s merchant display label.
 * Single emission source: server-side `merchant_suggestion_accepted`.
 */

import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { ensureProfile, getDb } from '@/lib/db';
import { isUndefinedColumnError, SCHEMA_UPGRADE_HINT } from '@/lib/pg-errors';
import { captureServerEvent } from '@/lib/posthog';

function bucketMerchantKey(key: string): string {
  if (key.length <= 8) {
    return key;
  }
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

function validateMerchantKey(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const s = raw.trim();
  if (s.length < 1 || s.length > 128) {
    return null;
  }
  return s;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const merchantKey = validateMerchantKey((body as { merchant_key?: unknown }).merchant_key);
  if (!merchantKey) {
    return NextResponse.json({ error: 'Invalid merchant_key.' }, { status: 400 });
  }

  try {
    await ensureProfile({ id: user.id, email: user.email });
    const sql = getDb();
    const rows = (await sql`
      SELECT suggested_label, confidence
      FROM merchant_label_suggestions
      WHERE user_id = ${user.id} AND merchant_key = ${merchantKey}
      LIMIT 1
    `) as { suggested_label: string; confidence: string | number | null }[];

    const row = rows[0];
    if (!row?.suggested_label?.trim()) {
      return NextResponse.json({ error: 'No suggestion for this merchant.' }, { status: 404 });
    }

    const label = row.suggested_label.trim();

    await sql`
      INSERT INTO user_merchant_aliases (user_id, merchant_key, display_label, updated_at)
      VALUES (${user.id}, ${merchantKey}, ${label}, timezone('utc', now()))
      ON CONFLICT (user_id, merchant_key) DO UPDATE SET
        display_label = EXCLUDED.display_label,
        updated_at = timezone('utc', now())
    `;

    void captureServerEvent(user.id, 'merchant_suggestion_accepted', {
      merchant_key_bucket: bucketMerchantKey(merchantKey),
      confidence: row.confidence != null ? Number(row.confidence) : undefined,
    }).catch(() => {});

    return NextResponse.json({ ok: true, merchant_key: merchantKey, display_label: label });
  } catch (e) {
    Sentry.captureException(e);
    console.error('[merchants/suggest-accept] POST failed:', e);
    if (isUndefinedColumnError(e)) {
      return NextResponse.json(
        { error: "Can't apply suggestion", code: 'SCHEMA_DRIFT', detail: SCHEMA_UPGRADE_HINT },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: 'Failed to apply suggestion' }, { status: 500 });
  }
}
