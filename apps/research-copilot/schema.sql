-- PM Research Copilot — Neon Postgres (run in SQL editor or via migrate)
-- Idempotent-ish: uses IF NOT EXISTS where practical.

CREATE TABLE IF NOT EXISTS research_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS research_projects_user_updated_idx
  ON research_projects (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES research_projects (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New session',
  phase TEXT NOT NULL DEFAULT 'planning'
    CHECK (phase IN ('planning', 'executing', 'stopped', 'completed')),
  plan_approved_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  centered_entry BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS research_sessions_user_updated_idx
  ON research_sessions (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS research_sessions_project_idx ON research_sessions (project_id);

CREATE TABLE IF NOT EXISTS research_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES research_sessions (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS research_messages_session_idx ON research_messages (session_id);

CREATE TABLE IF NOT EXISTS research_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES research_sessions (id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  plan_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS research_plans_session_idx ON research_plans (session_id);

CREATE TABLE IF NOT EXISTS research_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES research_sessions (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'stopped')),
  coverage_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS research_runs_session_idx ON research_runs (session_id);

CREATE TABLE IF NOT EXISTS evidence_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES research_runs (id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_url TEXT NOT NULL,
  snippet TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS evidence_snippets_run_idx ON evidence_snippets (run_id);

CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES research_sessions (id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format IN ('markdown', 'gdoc')),
  payload TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS exports_session_idx ON exports (session_id);
