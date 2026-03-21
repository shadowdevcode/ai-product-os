# Deploy Check: Issue-005 — SMB Feature Bundling Engine

**Command**: /deploy-check
**Date**: 2026-03-19
**Previous Gate**: metric_plan — done

---

## Build Status

| Check | Status | Notes |
|---|---|---|
| Next.js 16.1.6 App Router | ✅ Pass | `npm run build` compiled in 3.2s, TypeScript clean |
| All routes rendered | ✅ Pass | `/`, `/api/generate-proposal`, `/api/bundle-sessions/[id]/copied` |
| All dependencies installed | ✅ Pass | `@google/genai`, `@neondatabase/serverless`, `posthog-js`, `posthog-node` |
| TypeScript strict | ✅ Pass | No type errors |

---

## Environment Configuration

| Variable | Required | Behavior if Missing |
|---|---|---|
| `GEMINI_API_KEY` | Yes | 500 "Generation failed" — no env leak |
| `NEXT_PUBLIC_POSTHOG_KEY` | Yes | Graceful degradation — telemetry silently disabled |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | Defaults to `https://app.posthog.com` |
| `DATABASE_URL` | Yes | Non-blocking — proposal still returned on Neon failure |

No secrets hardcoded in source. ✅

---

## Infrastructure Readiness

| Component | Status | Notes |
|---|---|---|
| Neon DB schema | ⚠️ Manual | `schema.sql` is idempotent — must run in Neon SQL Editor before first deploy. `bundle_sessions` table + 2 indexes. |
| Vercel timeout | ✅ Pass | Default 10s; Gemini AbortController at 9s — safe margin |
| Rate limiter | ✅ Pass | 5 req/60s per IP (in-memory, per-instance; MVP acceptable) |
| DB failure tolerance | ✅ Pass | Non-blocking — proposal returned even if Neon insert fails |

---

## Monitoring Status

### All Required Events Now Implemented

| Event | Location | Status |
|---|---|---|
| `landing_page_viewed` | `app/page.tsx` useEffect on mount | ✅ Added |
| `bundle_generated` | `app/api/generate-proposal/route.ts` | ✅ Existing |
| `pitch_copied` | `components/EmailPitchCard.tsx` | ✅ Existing |
| `proposal_generation_failed` | `app/api/generate-proposal/route.ts` catch block | ✅ Added |
| `proposal_generation_timeout` | `app/api/generate-proposal/route.ts` timeout branch | ✅ Added |
| `proposal_generation_rate_limited` | `app/api/generate-proposal/route.ts` rate limit branch | ✅ Added |

PostHog 3-step funnel now fully instrumented:
`landing_page_viewed` → `bundle_generated` → `pitch_copied`

Drop-off observability: `proposal_generation_failed`, `proposal_generation_timeout`, `proposal_generation_rate_limited`

---

## Rollback Plan

| Check | Status |
|---|---|
| Previous build | N/A (first deploy) |
| DB schema reversible | ✅ Additive — drop table is safe |
| Redeploy via Vercel | ✅ Previous deploy hash retained |
| Rate limiter state | ✅ In-memory — resets clean on redeploy |

---

## Deployment Decision: **APPROVED**

All blockers resolved:
- T1 `proposal_generation_failed` — wired in route.ts catch block
- T2 `proposal_generation_timeout` — wired in route.ts timeout branch
- T3 `proposal_generation_rate_limited` — wired in route.ts rate limit branch
- T4 `landing_page_viewed` — `useEffect` + `posthog.capture` added to page.tsx
- Production build: `npm run build` passes clean in 3.2s

**Manual step before first deploy**: Apply `schema.sql` in Neon SQL Editor.

### Known Accepted Risks (MVP)

| Item | Decision |
|---|---|
| In-memory rate limiter (per-instance) | Accepted — MVP abuse prevention |
| Sequential DB + PostHog awaits | Accepted — `flushAt:1` is intentional |
| `price_range_label` not recalculated after clamping | Accepted — RR3 |
| No client-side fetch timeout | Accepted — QA6 low severity |
