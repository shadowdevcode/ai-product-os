-- SMB Bundle Builder — Neon DB schema
-- Run this against your Neon DB before first deploy.
-- Idempotent: safe to re-run.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS bundle_sessions (
    id                              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    selected_features               TEXT[]      NOT NULL,
    price_range_label               TEXT        NOT NULL,
    generated_price_inr             INTEGER     NOT NULL,
    estimated_monthly_savings_inr   INTEGER     NOT NULL,
    roi_points                      TEXT[]      NOT NULL,
    email_pitch                     TEXT        NOT NULL,
    pitch_copied                    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enables efficient date-range analytics queries
CREATE INDEX IF NOT EXISTS idx_bundle_sessions_created_at
    ON bundle_sessions (created_at DESC);

-- Enables "which features appear most in copied sessions" queries
CREATE INDEX IF NOT EXISTS idx_bundle_sessions_features
    ON bundle_sessions USING GIN (selected_features);
