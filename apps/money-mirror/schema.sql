-- MoneyMirror Database Schema
-- Target: Neon Postgres

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    monthly_income_paisa BIGINT,
    perceived_spend_paisa BIGINT NOT NULL DEFAULT 0,
    target_savings_rate INT NOT NULL DEFAULT 20,
    money_health_score INT,
    onboarded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL DEFAULT 'HDFC',
    institution_name TEXT NOT NULL DEFAULT 'Unknown',
    statement_type TEXT NOT NULL CHECK (statement_type IN ('bank_account', 'credit_card')) DEFAULT 'bank_account',
    period_start DATE,
    period_end DATE,
    due_date DATE,
    total_debits_paisa BIGINT NOT NULL DEFAULT 0,
    total_credits_paisa BIGINT NOT NULL DEFAULT 0,
    perceived_spend_paisa BIGINT NOT NULL DEFAULT 0,
    payment_due_paisa BIGINT,
    minimum_due_paisa BIGINT,
    credit_limit_paisa BIGINT,
    status TEXT NOT NULL CHECK (status IN ('processing', 'processed', 'failed')) DEFAULT 'processing',
    nickname TEXT,
    account_purpose TEXT,
    card_network TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID NOT NULL REFERENCES public.statements(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount_paisa BIGINT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
    category TEXT NOT NULL CHECK (category IN ('needs', 'wants', 'investment', 'debt', 'other')),
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    merchant_key TEXT,
    upi_handle TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.advisory_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    statement_id UUID REFERENCES public.statements(id) ON DELETE CASCADE,
    trigger TEXT NOT NULL,
    headline TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'info',
    amount_paisa BIGINT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_statements_user_created_at
    ON public.statements(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user_statement
    ON public.transactions(user_id, statement_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date
    ON public.transactions(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user_merchant
    ON public.transactions(user_id, merchant_key)
    WHERE merchant_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_advisory_feed_user_created_at
    ON public.advisory_feed(user_id, created_at DESC);

-- Existing Neon DBs: add statement label columns (idempotent)
ALTER TABLE public.statements ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE public.statements ADD COLUMN IF NOT EXISTS account_purpose TEXT;
ALTER TABLE public.statements ADD COLUMN IF NOT EXISTS card_network TEXT;

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS merchant_key TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS upi_handle TEXT;

CREATE TABLE IF NOT EXISTS public.user_merchant_aliases (
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    merchant_key TEXT NOT NULL,
    display_label TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT user_merchant_aliases_label_nonempty CHECK (length(trim(display_label)) > 0),
    PRIMARY KEY (user_id, merchant_key)
);

CREATE INDEX IF NOT EXISTS idx_user_merchant_aliases_user
    ON public.user_merchant_aliases(user_id);

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
);

CREATE INDEX IF NOT EXISTS idx_merchant_label_suggestions_user
    ON public.merchant_label_suggestions(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_upi
    ON public.transactions(user_id, upi_handle)
    WHERE upi_handle IS NOT NULL;

-- P4-G: subscription tier (default free = full access until payments ship)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'pro'));

-- Issue-012: guided review outcomes (optional saved commitment)
-- Privacy: commitment_text is opt-in only; CASCADE on profile delete covers cleanup.
CREATE TABLE IF NOT EXISTS public.guided_review_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    statement_id UUID REFERENCES public.statements(id) ON DELETE SET NULL,
    dismissed BOOLEAN NOT NULL DEFAULT false,
    commitment_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_guided_review_outcomes_user_created
    ON public.guided_review_outcomes(user_id, created_at DESC);

-- ──────────────────────────────────────────────────────────────────────────────
-- Gmail Sync additions (apply before using /gmail-sync command or endpoint)
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Extend statement_type to allow gmail-sourced synthetic statements
ALTER TABLE public.statements DROP CONSTRAINT IF EXISTS statements_statement_type_check;
ALTER TABLE public.statements ADD CONSTRAINT statements_statement_type_check
    CHECK (statement_type IN ('bank_account', 'credit_card', 'gmail_sync'));

-- 2. Track ingestion source on statements
ALTER TABLE public.statements
    ADD COLUMN IF NOT EXISTS ingestion_source TEXT
    CHECK (ingestion_source IN ('pdf_upload', 'gmail_command', 'gmail_manual_ui', 'gmail_cron'))
    DEFAULT 'pdf_upload';

-- 3. Dedup hash on transactions — prevents duplicate inserts across sync runs
--    Formula: md5(user_id + (date-epoch_days)::text + amount_paisa + description)
--    Uses integer day-offset (date - '1970-01-01') to keep expression immutable in Postgres.
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS dedup_hash TEXT
    GENERATED ALWAYS AS (
        md5(user_id || (date - '1970-01-01'::date)::text || amount_paisa::text || description)
    ) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_dedup
    ON public.transactions(user_id, dedup_hash);

-- 4. OAuth token storage per user (Phase 2 — Google OAuth for multi-user sync)
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
);

-- 5. Durable sync run history for debugging and status display
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
);

CREATE INDEX IF NOT EXISTS idx_gmail_sync_runs_user_created
    ON public.gmail_sync_runs(user_id, created_at DESC);
