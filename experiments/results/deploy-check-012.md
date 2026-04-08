# Deploy-check — issue-012 (MoneyMirror Gen Z clarity loop)

**Date:** 2026-04-07  
**App:** `apps/money-mirror`  
**Schema source of truth:** [`apps/money-mirror/schema.sql`](../../apps/money-mirror/schema.sql)

**Verdict:** **APPROVE deployment readiness**

---

## Local smoke test (Gate 0 - PM confirmed)

- **Automated evidence:** `npm --prefix apps/money-mirror run build` completed successfully.
- **PM confirmation:** Gate 0 manually confirmed by PM in-session (dev server, login/OTP, onboarding write, upload->parse->dashboard journey, no unexpected 500s).

---

## Build status

- `npm --prefix apps/money-mirror run build`: **PASS**.
- `@sentry/nextjs` logged non-fatal source-map upload errors in this sandbox (network 403 while tunneling), but Next.js compile/typegen/page generation completed and exited 0.

---

## Environment configuration (FILLED / EMPTY / MISSING)

**Code scan:** `process.env.*` under `apps/money-mirror/src` is fully represented in `.env.local.example` (no missing keys in the example template).

**Required keys from app code:**

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

**Non-blocking optional/exception vars:**

| Variable                 | Status  | Notes                                                                         |
| ------------------------ | ------- | ----------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN` | EMPTY   | Allowed with PM exception pattern used in prior cycles.                       |
| `SENTRY_ORG`             | EMPTY   | Allowed with PM exception pattern used in prior cycles.                       |
| `SENTRY_PROJECT`         | EMPTY   | Allowed with PM exception pattern used in prior cycles.                       |
| `WHATSAPP_API_URL`       | MISSING | Explicitly documented optional in `.env.local.example` (stub mode supported). |
| `WHATSAPP_API_TOKEN`     | MISSING | Explicitly documented optional in `.env.local.example` (stub mode supported). |

---

## Infrastructure readiness

### Database schema verification

Tables expected from `schema.sql`:

- `profiles`
- `statements`
- `transactions`
- `advisory_feed`
- `user_merchant_aliases`
- `merchant_label_suggestions`
- `guided_review_outcomes`

Verified directly against the configured Neon DB (`DATABASE_URL` from app `.env.local`) using `information_schema.tables` after running:

- `npm --prefix apps/money-mirror run db:upgrade`

Observed tables:

- `advisory_feed`
- `guided_review_outcomes`
- `merchant_label_suggestions`
- `profiles`
- `statements`
- `transactions`
- `user_merchant_aliases`

**Status:** PASS.

---

## Monitoring status

- **PostHog:** server + client instrumentation present (`src/lib/posthog.ts`, `src/lib/posthog-browser.ts`, `WebVitalsReporter`).
- **Sentry:** `@sentry/nextjs` installed; `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` exist; `next.config.ts` wraps with `withSentryConfig`; multiple API handlers use `Sentry.captureException(...)`.

---

## Rollback plan

- Roll back by promoting a prior Vercel deployment.
- DB changes are additive/idempotent; rollback is deploy-level rather than destructive schema rollback.
- Runtime flags available (`NEXT_PUBLIC_PAYWALL_PROMPT_ENABLED`, optional WhatsApp relay envs).

---

## README quality gate

`apps/money-mirror/README.md` passes the template gate: one-liner, numbered user journey, stack table, complete setup flow, env table, schema section, `npm run dev` success/failure cues, API endpoints list, analytics event table, and key design decisions.  
`.env.local.example` exists and README is not default Next.js boilerplate.

---

## Sentry error tracking

- Package and config wiring present.
- Env keys are listed in `.env.local.example`.
- API routes capture exceptions.
- Sentry-related empty vars are non-blocking only if PM exception is explicitly carried for this cycle.

---

## PR creation

Not attempted in this deploy-check pass. Repo has substantial in-flight changes for issue-012 and prior work; create PR after desired commit slicing/branching strategy is finalized.

---

## Deployment decision

**Approve Deployment**

### Conditions

1. Keep current schema state (including `guided_review_outcomes`) aligned in production/staging DBs.
2. When ready to ship code, create a scoped commit/PR from this branch.

**Next pipeline command:** `/postmortem`
