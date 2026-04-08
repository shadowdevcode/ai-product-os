# Deploy-check — issue-011 (MoneyMirror Phase 4)

**Date:** 2026-04-07  
**App:** `apps/money-mirror`  
**Schema source of truth:** [`apps/money-mirror/schema.sql`](../../apps/money-mirror/schema.sql)

**Verdict:** **APPROVE deployment readiness** (PM Sentry env exception carried from issue-010; manual OTP/PDF smoke still recommended)

---

## Local smoke test (Gate 0)

**Automated evidence this session:** `npm run build` exit 0 (see Build status).

**PM manual (required for full Gate 0 sign-off):** OTP send, onboarding DB write, PDF parse end-to-end, no unexpected 500s — same bar as [`deploy-check-010.md`](deploy-check-010.md). Not re-run as an interactive session here.

---

## Build status

- `npm run build` (`apps/money-mirror`): **PASS** (exit 0).
- Sentry webpack / `sentry-cli` logged **non-fatal** upload warnings (403 / tunnel) during `runAfterProductionCompile`; build completed. Aligns with prior cycle note: sandbox/network can block source-map upload without failing the compile.

---

## Environment configuration

**Scan:** `process.env.*` usage under `apps/money-mirror/src/` (+ `sentry.client.config.ts`, `next.config.ts`, scripts) vs [`apps/money-mirror/.env.local.example`](../../apps/money-mirror/.env.local.example).

**Result:** No app-originated env key found in code that is missing from `.env.local.example`.

**Blocking classification (local `.env.local` — values not printed):**

| Variable              | Status |
| --------------------- | ------ |
| `DATABASE_URL`        | FILLED |
| `NEON_AUTH_BASE_URL`  | FILLED |
| `GEMINI_API_KEY`      | FILLED |
| `RESEND_API_KEY`      | FILLED |
| `POSTHOG_KEY`         | FILLED |
| `POSTHOG_HOST`        | FILLED |
| `NEXT_PUBLIC_APP_URL` | FILLED |
| `CRON_SECRET`         | FILLED |

**PM exception (issue-010 Decisions Log / prior deploy-check):** `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` may be **EMPTY** without blocking — client/org/project optional locally; server init uses `sentry.server.config.ts` (embedded DSN).

**Optional / runtime (not blocking if empty):** `NEON_AUTH_COOKIE_SECRET` (per README), `NEXT_PUBLIC_POSTHOG_*`, `WHATSAPP_*`, `NEXT_PUBLIC_PAYWALL_PROMPT_ENABLED`, `MONEYMIRROR_SKIP_AUTO_SCHEMA`, `SENTRY_AUTH_TOKEN` (needed for CI source-map upload to succeed, not for local compile).

---

## Infrastructure readiness — Neon schema verification

**Method:** `@neondatabase/serverless` + `DATABASE_URL` from local `.env.local` → `information_schema.tables` (`public`, `BASE TABLE`).

**Initial query (before upgrade):** Only `advisory_feed`, `profiles`, `statements`, `transactions` — **Phase 4 tables not yet present** on this database.

**Remediation (idempotent, same as boot `schema-upgrades`):** `npm run db:upgrade` from `apps/money-mirror` → **success**.

**After upgrade — all `CREATE TABLE` targets from `schema.sql` present:**

| Table                        | Status  |
| ---------------------------- | ------- |
| `profiles`                   | PRESENT |
| `statements`                 | PRESENT |
| `transactions`               | PRESENT |
| `advisory_feed`              | PRESENT |
| `user_merchant_aliases`      | PRESENT |
| `merchant_label_suggestions` | PRESENT |

**Operator note:** Production Neon must have run `schema.sql` / `db:upgrade` / server boot DDL **before** relying on P4 merchant alias flows; verify on prod if this DB was ever behind.

---

## Monitoring status

- **PostHog:** Server (`posthog.ts`) + optional client (`posthog-browser.ts`, `WebVitalsReporter`) — wired per README Analytics table.
- **Sentry:** `@sentry/nextjs` in `package.json`; `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`; `next.config.ts` uses `withSentryConfig()`; multiple API routes call `Sentry.captureException` (e.g. dashboard, transactions, merchants, persist-statement, cron).

---

## Rollback plan

- **Vercel:** Redeploy previous production deployment or promote an earlier deployment from the dashboard.
- **DB:** Migrations are additive (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`); rollback is feature-level (revert deploy), not automatic DDL rollback.
- **Feature flags:** `NEXT_PUBLIC_PAYWALL_PROMPT_ENABLED`, optional WhatsApp relay — configurable via env without code change.

---

## README quality gate

[`apps/money-mirror/README.md`](../../apps/money-mirror/README.md) satisfies `knowledge/readme-template.md`: one-liner, numbered journey, stack table, setup with env table + schema + `npm run dev`, API section covering routes (including Phase 4), Analytics table, Key design decisions. `.env.local.example` exists. Not default Next.js boilerplate.

---

## Sentry verification

- Package: `@sentry/nextjs` present.
- Config files present with `Sentry.init()`.
- `NEXT_PUBLIC_SENTRY_DSN` listed in `.env.local.example`.
- `withSentryConfig` wraps `next.config.ts`.
- API / server paths use `Sentry.captureException`.
- PM exception applies to empty client/org/project env vars (see above).

---

## PR creation

**Status:** **Not completed** (automated step blocked).

Staging `apps/money-mirror`, `experiments/`, `project-state.md`, and `CHANGELOG.md` for commit triggered the repo **husky pre-commit** hook. **File size check failed** (300-line limit per `.claude/rules/code-quality.md`):

| File                                                   | Lines |
| ------------------------------------------------------ | ----- |
| `apps/money-mirror/src/app/dashboard/ResultsPanel.tsx` | 397   |
| `apps/money-mirror/src/components/MerchantRollups.tsx` | 301   |
| `apps/money-mirror/src/lib/advisory-engine.ts`         | 307   |
| `apps/money-mirror/src/lib/dashboard-compare.ts`       | 303   |

**Remediation:** Split these modules into smaller files (preferred), or obtain a **PM-approved** exception and commit with `git commit --no-verify` only if policy allows. After a successful commit, run `git push -u origin <branch>` and `gh pr create` per `commands/deploy-check.md`.

**PR URL:** _(none — commit did not land)_

---

## Deployment decision

**Approve deployment** for MoneyMirror Phase 4 (issue-011), subject to:

1. Production Neon schema aligned (run `db:upgrade` or confirm boot DDL if any table missing).
2. Manual OTP + PDF smoke before high-traffic promotion.
3. `SENTRY_AUTH_TOKEN` / CI secrets on Vercel for clean source-map uploads (optional for runtime).

**Next pipeline command:** `/postmortem`
