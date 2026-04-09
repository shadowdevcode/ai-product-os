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
  await sql`
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS upi_handle TEXT
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS public.user_merchant_aliases (
      user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      merchant_key TEXT NOT NULL,
      display_label TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
      CONSTRAINT user_merchant_aliases_label_nonempty CHECK (length(trim(display_label)) > 0),
      PRIMARY KEY (user_id, merchant_key)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_user_merchant_aliases_user
      ON public.user_merchant_aliases(user_id)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS public.merchant_label_suggestions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      merchant_key TEXT NOT NULL,
      suggested_label TEXT NOT NULL,
      confidence NUMERIC,
      source TEXT NOT NULL DEFAULT 'gemini',
      model TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
      CONSTRAINT merchant_label_suggestions_label_nonempty CHECK (length(trim(suggested_label)) > 0),
      CONSTRAINT merchant_label_suggestions_unique_per_user_key UNIQUE (user_id, merchant_key)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_merchant_label_suggestions_user
      ON public.merchant_label_suggestions(user_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_transactions_user_upi
      ON public.transactions(user_id, upi_handle)
      WHERE upi_handle IS NOT NULL
  `;
  await sql`
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
  `;
  await sql`
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check
  `;
  await sql`
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'pro'))
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS public.guided_review_outcomes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      statement_id UUID REFERENCES public.statements(id) ON DELETE SET NULL,
      dismissed BOOLEAN NOT NULL DEFAULT false,
      commitment_text TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_guided_review_outcomes_user_created
      ON public.guided_review_outcomes(user_id, created_at DESC)
  `;

  // Phase 5: Gmail sync tables
  await sql`
    CREATE TABLE IF NOT EXISTS public.user_oauth_tokens (
      user_id       TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      provider      TEXT NOT NULL DEFAULT 'google',
      access_token  TEXT NOT NULL,
      refresh_token TEXT,
      expires_at    TIMESTAMPTZ NOT NULL,
      scope         TEXT,
      status        TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'revoked', 'refresh_failed')),
      last_sync_at  TIMESTAMPTZ,
      last_error    TEXT,
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, provider)
    )
  `;
  await sql`
    ALTER TABLE public.transactions
      ADD COLUMN IF NOT EXISTS dedup_hash TEXT
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_dedup
      ON public.transactions(user_id, dedup_hash)
      WHERE dedup_hash IS NOT NULL
  `;
  await sql`
    ALTER TABLE public.statements
      ADD COLUMN IF NOT EXISTS ingestion_source TEXT
      DEFAULT 'pdf_upload'
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS public.gmail_sync_runs (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id        TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      trigger_mode   TEXT NOT NULL CHECK (trigger_mode IN ('command', 'manual_ui', 'cron')),
      status         TEXT NOT NULL CHECK (status IN ('ok', 'partial', 'failed')),
      emails_scanned INT NOT NULL DEFAULT 0,
      parsed_count   INT NOT NULL DEFAULT 0,
      inserted_count INT NOT NULL DEFAULT 0,
      skipped_count  INT NOT NULL DEFAULT 0,
      error_summary  TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_gmail_sync_runs_user_created
      ON public.gmail_sync_runs(user_id, created_at DESC)
  `;
}
