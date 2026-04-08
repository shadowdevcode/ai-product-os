/**
 * GET/POST/DELETE /api/merchants/alias
 *
 * User-defined display labels for normalized merchant_key values.
 * Single emission source: server-side `merchant_alias_saved` on successful POST.
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

function validateDisplayLabel(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const s = raw.trim();
  if (s.length < 1 || s.length > 120) {
    return null;
  }
  return s;
}

export async function GET(): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureProfile({ id: user.id, email: user.email });
    const sql = getDb();
    const rows = (await sql`
      SELECT merchant_key, display_label, updated_at
      FROM user_merchant_aliases
      WHERE user_id = ${user.id}
      ORDER BY updated_at DESC
    `) as { merchant_key: string; display_label: string; updated_at: string }[];

    return NextResponse.json({ aliases: rows });
  } catch (e) {
    Sentry.captureException(e);
    console.error('[merchants/alias] GET failed:', e);
    if (isUndefinedColumnError(e)) {
      return NextResponse.json(
        { error: "Can't load aliases", code: 'SCHEMA_DRIFT', detail: SCHEMA_UPGRADE_HINT },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: 'Failed to load aliases' }, { status: 500 });
  }
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

  const b = body as Record<string, unknown>;
  const merchantKey = validateMerchantKey(b.merchant_key);
  const displayLabel = validateDisplayLabel(b.display_label);
  if (!merchantKey || !displayLabel) {
    return NextResponse.json(
      { error: 'Invalid merchant_key or display_label (1–128 / 1–120 chars).' },
      { status: 400 }
    );
  }

  try {
    await ensureProfile({ id: user.id, email: user.email });
    const sql = getDb();
    await sql`
      INSERT INTO user_merchant_aliases (user_id, merchant_key, display_label, updated_at)
      VALUES (${user.id}, ${merchantKey}, ${displayLabel}, timezone('utc', now()))
      ON CONFLICT (user_id, merchant_key) DO UPDATE SET
        display_label = EXCLUDED.display_label,
        updated_at = timezone('utc', now())
    `;

    void captureServerEvent(user.id, 'merchant_alias_saved', {
      merchant_key_bucket: bucketMerchantKey(merchantKey),
    }).catch(() => {});

    return NextResponse.json({ ok: true, merchant_key: merchantKey, display_label: displayLabel });
  } catch (e) {
    Sentry.captureException(e);
    console.error('[merchants/alias] POST failed:', e);
    if (isUndefinedColumnError(e)) {
      return NextResponse.json(
        { error: "Can't save alias", code: 'SCHEMA_DRIFT', detail: SCHEMA_UPGRADE_HINT },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: 'Failed to save alias' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const merchantKey = validateMerchantKey(req.nextUrl.searchParams.get('merchant_key'));
  if (!merchantKey) {
    return NextResponse.json({ error: 'Invalid or missing merchant_key.' }, { status: 400 });
  }

  try {
    await ensureProfile({ id: user.id, email: user.email });
    const sql = getDb();
    await sql`
      DELETE FROM user_merchant_aliases
      WHERE user_id = ${user.id} AND merchant_key = ${merchantKey}
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    Sentry.captureException(e);
    console.error('[merchants/alias] DELETE failed:', e);
    if (isUndefinedColumnError(e)) {
      return NextResponse.json(
        { error: "Can't remove alias", code: 'SCHEMA_DRIFT', detail: SCHEMA_UPGRADE_HINT },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: 'Failed to remove alias' }, { status: 500 });
  }
}
