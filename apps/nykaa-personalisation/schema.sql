-- Nykaa Personalisation MVP — Database Schema
-- All statements are idempotent (safe to run multiple times)
-- Apply in Neon SQL Editor before first deploy

-- Experiment cohort assignment (stable A/B per user per experiment)
CREATE TABLE IF NOT EXISTS experiment_cohorts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL,
  experiment_id TEXT NOT NULL DEFAULT 'personalisation-v1',
  cohort        TEXT NOT NULL CHECK (cohort IN ('control', 'test')),
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, experiment_id)
);
CREATE INDEX IF NOT EXISTS idx_cohorts_user_experiment
  ON experiment_cohorts(user_id, experiment_id);

-- Pre-computed historical affinity per user (rebuilt nightly by cron)
CREATE TABLE IF NOT EXISTS user_affinity_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL UNIQUE,
  top_brands      TEXT[] DEFAULT '{}',
  top_categories  TEXT[] DEFAULT '{}',
  order_count     INT NOT NULL DEFAULT 0,
  session_count   INT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_affinity_user
  ON user_affinity_profiles(user_id);

-- In-session product click events (TTL: cleared after 24h)
CREATE TABLE IF NOT EXISTS session_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  session_id  TEXT NOT NULL,
  product_id  TEXT NOT NULL,
  brand_id    TEXT,
  category_id TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_session_events_user_session
  ON session_events(user_id, session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_events_created
  ON session_events(created_at);
