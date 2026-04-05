# Deploy-check — issue-010 (MoneyMirror Phase 3)

**Date:** 2026-04-05 (updated same day)  
**App:** `apps/money-mirror`  
**Schema source of truth:** [`apps/money-mirror/schema.sql`](../../apps/money-mirror/schema.sql) — _not_ `apps/clarity` (Clarity is a different app).

**Verdict:** **APPROVE deployment readiness** (with PM env exception + manual smoke follow-ups below)

---

## PM exception — Sentry client / org / project env vars

Per product decision, **`NEXT_PUBLIC_SENTRY_DSN`**, **`SENTRY_ORG`**, and **`SENTRY_PROJECT`** are **out of scope for the deploy-check environment gate**. They may remain empty locally. Server-side Sentry still initializes in `sentry.server.config.ts`; client DSN is optional when unused.

`.env.local.example` marks these three as optional for local/dev parity.

---

## Local smoke test (Gate 0)

### Automated (this session)

- **`npm run dev`** with `next dev -H 127.0.0.1 -p 3000` — server **Ready** without errors.
- **HTTP checks** (expect HTML):
  - `GET /` → **200**
  - `GET /login` → **200**
  - `GET /dashboard` → **200** (may redirect in browser; SSR returned 200 here)
- **Cron auth contract:** `GET /api/cron/weekly-recap` without secret → **401**

### Manual (you still should run)

These cannot be fully automated without real OTP/email and a PDF:

1. **Neon Auth:** On `/login`, send OTP and complete sign-in.
2. **Onboarding:** Finish flow; confirm `profiles` row updates (DB write).
3. **Statement:** Upload a PDF; confirm parse + dashboard data.
4. **Console/terminal:** No unexpected 500s during the journey.

---

## Build status

- `npm run build` (apps/money-mirror): **PASS** (exit 0).
- Note: Sentry webpack plugin may log `sentry-cli` upload warnings if Sentry API is unreachable; build still completed.

---

## Environment configuration

Scan of `process.env.*` usage vs `apps/money-mirror/.env.local.example`: **aligned**.

**Blocking check applies to** all non-optional vars (DB, Neon Auth, Gemini, Resend, PostHog, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, etc.).

**Excluded from blocking (PM):** `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` — empty values **do not** fail this gate.

---

## Infrastructure readiness — Neon schema verification

**Method used:** `DATABASE_URL` from local `.env.local` + `@neondatabase/serverless` (`neon` SQL) querying `information_schema.tables` for `table_schema = 'public'`.

**Result:** All tables required by [`apps/money-mirror/schema.sql`](../../apps/money-mirror/schema.sql) are **present** on the connected Neon project:

| Expected table  | Status  |
| --------------- | ------- |
| `profiles`      | PRESENT |
| `statements`    | PRESENT |
| `transactions`  | PRESENT |
| `advisory_feed` | PRESENT |

**Public tables observed:** `advisory_feed`, `profiles`, `statements`, `transactions` (no extra app tables required for this gate).

### If you need to reproduce or verify on another database

1. Open **Neon Console** → your project → **SQL Editor**.
2. Run:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

3. Confirm the four tables above exist; if not, paste and run the full contents of `apps/money-mirror/schema.sql` (idempotent `CREATE TABLE IF NOT EXISTS` + `ALTER ... IF NOT EXISTS`).

---

## Monitoring status

- **PostHog:** Wired per README / metric plan.
- **Sentry:** Package + configs + `withSentryConfig` + `captureException` usage verified. Client DSN optional per PM.

---

## Rollback plan

- **Vercel:** Roll back to a prior deployment or redeploy a known-good commit (`vercel deploy --prod` from monorepo root per `project-state.md` notes).
- **Neon:** Schema in repo is additive; avoid destructive DDL on production without a migration plan.

---

## README quality gate

- **PASS** — includes one-liner, journey, stack, env names, schema step, dev command, API surface (including `/api/auth/[...path]` and `GET /api/sentry-example-api`), analytics table, design decisions.

---

## Sentry error tracking verification

- **Configuration:** PASS (library, configs, `withSentryConfig`, exception capture in routes).
- **PM scope:** Client/org/project env vars not required for gate (see top).

---

## PR creation

**Not executed in this run** — optional once you commit Phase 3 + experiment files and want a GitHub PR. Command protocol: `git status` clean → `gh pr create` as in `commands/deploy-check.md`.

---

## Deployment decision

### Approve deployment (readiness)

Remaining human steps:

1. Run **manual smoke** (OTP → onboarding → upload) on **local** or **Vercel preview/production** as you prefer.
2. **Commit and push** when ready; deploy to Vercel if you want production validation.
3. **`/linear-sync release`** after a production deploy if you need Linear updated with links.

### Next command in pipeline (`system-orchestrator.md`)

After you treat deploy-check as complete for this cycle:

1. **`/postmortem`** — analyzes the full pipeline run (required **after** deploy-check passes; it is the **next** stage, not optional if you are closing the issue-010 cycle).
2. **`/learning`** — only after postmortem completes.

So the plan is: **finish any manual smoke → commit/deploy as you like → run `/postmortem` → then `/learning`**.

---

## Revision history

- **2026-04-05 (initial):** Blocked on empty Sentry trio + no smoke + MCP schema unavailable.
- **2026-04-05 (revision):** PM excludes Sentry trio from env gate; Neon tables verified via live query; automated local HTTP + cron 401 smoke added; verdict **APPROVE** readiness; clarified schema path is `apps/money-mirror/schema.sql` only.
