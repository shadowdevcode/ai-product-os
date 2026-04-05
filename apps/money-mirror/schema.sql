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
