-- Ozi Reorder Experiment — Database Schema
-- All statements are idempotent (safe to run multiple times)
-- Apply in Neon SQL Editor before first deploy

-- Simulates Ozi's existing orders table (additive — no changes to real table needed)
CREATE TABLE IF NOT EXISTS mock_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      TEXT NOT NULL UNIQUE,
  user_id       TEXT NOT NULL,
  user_name     TEXT NOT NULL,
  sku_category  TEXT NOT NULL CHECK (sku_category IN ('diapers', 'baby-essentials')),
  product_name  TEXT NOT NULL,
  brand         TEXT NOT NULL,
  quantity      INT NOT NULL DEFAULT 1,
  price_inr     INT NOT NULL,
  image_url     TEXT,
  delivered_at  TIMESTAMPTZ NOT NULL,
  reminder_sent BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_mock_orders_delivered ON mock_orders(delivered_at);
CREATE INDEX IF NOT EXISTS idx_mock_orders_user      ON mock_orders(user_id);

-- Experiment cohort assignment
-- One row per user, persisted on first evaluation to prevent re-randomization
CREATE TABLE IF NOT EXISTS experiment_cohorts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL UNIQUE,
  group_name  TEXT NOT NULL CHECK (group_name IN ('test', 'control')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reminder log — one row per notification dispatched
CREATE TABLE IF NOT EXISTS reminders_sent (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL,
  order_id     TEXT NOT NULL,
  sku_category TEXT NOT NULL,
  trigger_day  INT NOT NULL,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered    BOOLEAN NOT NULL DEFAULT FALSE,
  opened       BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_reminders_user    ON reminders_sent(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_sent_at ON reminders_sent(sent_at);

-- Reorder events — tracks conversions from both test and control groups
CREATE TABLE IF NOT EXISTS reorder_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL,
  source            TEXT NOT NULL CHECK (source IN ('reminder', 'organic')),
  reminder_id       UUID REFERENCES reminders_sent(id),
  original_order_id TEXT NOT NULL,
  new_order_id      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reorder_user   ON reorder_events(user_id);
CREATE INDEX IF NOT EXISTS idx_reorder_source ON reorder_events(source);

-- Cron run log — observability for the trigger mechanism
CREATE TABLE IF NOT EXISTS cron_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  users_evaluated  INT,
  reminders_sent   INT,
  errors           INT
);
