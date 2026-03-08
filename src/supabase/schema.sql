-- Gmail Summary → WhatsApp Notifier — Database Schema
-- Run this in Supabase SQL Editor to create the tables

-- ==========================================
-- TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         varchar(255) UNIQUE NOT NULL,
  google_access_token   text,
  google_refresh_token  text,
  token_expires_at      timestamptz,
  whatsapp_phone        varchar(20),
  digest_frequency      varchar(10) DEFAULT '3x_day' CHECK (digest_frequency IN ('2h', '3x_day', 'daily')),
  is_active             boolean DEFAULT true,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS digests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  summary_text        text,
  email_count         integer,
  priority_breakdown  jsonb,
  sent_at             timestamptz,
  delivery_status     varchar(20) DEFAULT 'sent',
  created_at          timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS processed_emails (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gmail_message_id  varchar(255) NOT NULL,
  digest_id         uuid REFERENCES digests(id) ON DELETE SET NULL,
  processed_at      timestamptz DEFAULT now()
);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_digests_user_sent ON digests(user_id, sent_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_processed_user_gmail ON processed_emails(user_id, gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_users_active_freq ON users(is_active, digest_frequency);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

-- Enable RLS on all tables (service_role key bypasses RLS by default)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_emails ENABLE ROW LEVEL SECURITY;

-- Users: users can only read/update their own row
CREATE POLICY users_select_own ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Digests: users can only see their own digests
CREATE POLICY digests_select_own ON digests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY digests_insert_own ON digests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Processed emails: users can only see their own records
CREATE POLICY processed_select_own ON processed_emails
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY processed_insert_own ON processed_emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow service_role full access (used by cron worker and API routes)
-- Note: service_role bypasses RLS by default in Supabase, these are
-- explicit grants as defense-in-depth.
CREATE POLICY service_users ON users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY service_digests ON digests
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY service_processed ON processed_emails
  FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- AUTO-UPDATE updated_at
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- TTL CLEANUP (requires pg_cron extension)
-- ==========================================
-- Enable pg_cron if not already enabled:
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- Schedule daily cleanup of processed_emails older than 30 days:
SELECT cron.schedule(
  'cleanup-processed-emails',
  '0 3 * * *',  -- daily at 3:00 AM UTC
  $$DELETE FROM processed_emails WHERE processed_at < now() - interval '30 days'$$
);
