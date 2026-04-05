import type { NeonQueryFunction } from '@neondatabase/serverless';

/**
 * Idempotent DDL for Neon DBs created before Phase 2/3 columns.
 * Keep in sync with the tail of `schema.sql`.
 */
export async function applyIdempotentSchemaUpgrades(
  sql: NeonQueryFunction<false, false>
): Promise<void> {
  await sql`
    ALTER TABLE public.statements ADD COLUMN IF NOT EXISTS nickname TEXT
  `;
  await sql`
    ALTER TABLE public.statements ADD COLUMN IF NOT EXISTS account_purpose TEXT
  `;
  await sql`
    ALTER TABLE public.statements ADD COLUMN IF NOT EXISTS card_network TEXT
  `;
  await sql`
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS merchant_key TEXT
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_transactions_user_merchant
      ON public.transactions(user_id, merchant_key)
      WHERE merchant_key IS NOT NULL
  `;
}
