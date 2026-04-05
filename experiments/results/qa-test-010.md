# QA Test — issue-010 MoneyMirror Phase 3

**Date:** 2026-04-05  
**Command:** `/qa-test`  
**Reviewer:** Codex  
**Inputs:** `experiments/plans/plan-010.md`, `experiments/results/review-010.md`, `experiments/results/peer-review-010.md`, `apps/money-mirror/CODEBASE-CONTEXT.md`

---

## Functional Tests

- `npm test` in `apps/money-mirror`: **PASS** (`76/76`)
- `npm run lint` in `apps/money-mirror`: **PASS**
- `npm run build` in `apps/money-mirror`: **PASS**
- Code-path verification: authenticated dashboard rehydration, unified scope parsing, transactions list filters, merchant rollup deep link flow, and facts-grounded coaching all align with the shipped Phase 3 architecture.
- Cron contract verification: weekly recap master requires `CRON_SECRET`, fans out to the worker, and counts failures by worker HTTP status instead of assuming success.

---

## Edge Cases

- Env var key name cross-check: **PASS**
  - Source audit of `process.env.*` usage matches `.env.local.example` for user-supplied keys.
  - `NEXT_RUNTIME` appears in source but is a Next.js platform runtime flag used by `src/instrumentation.ts`, not a user-managed `.env.local` key.
- Dashboard scope validation: code correctly rejects partial unified scope (`date_from` without `date_to`, invalid UUIDs, invalid dates) via `parseDashboardScopeFromSearchParams`.
- Merchant backfill edge case: previously unresolvable `merchant_key` rows could spin forever; current cursor-based implementation avoids that failure mode.
- Upload edge checks remain present: PDF-only, 10 MB max, scanned/password-protected failure messaging, and 3/day rate-limit path.

---

## Failure Scenarios

- PostHog unavailability on cron paths: **PASS by code-path inspection**
  - Master route telemetry is wrapped in `.catch(...)` and does not control the HTTP result.
  - Worker success/failure telemetry is also wrapped in `.catch(...)`; email success is not downgraded to 500 by PostHog failure.
- Failure telemetry verification for weekly recap worker: **PASS by code-path inspection**
  - Worker emits `weekly_recap_email_failed` in the send-email catch path.
  - Worker returns HTTP `502` on send failure, allowing the master to count the run as failed.
- Dashboard/API reliability: dashboard fetch path now uses `AbortController` to avoid stale-scope overwrites when users change filters/ranges quickly.

---

## Performance Risks

- No blocking performance defect found in this QA pass.
- Residual hardening item: authenticated heavy read routes (`/api/transactions`, `/api/insights/merchants`) do not yet have explicit per-user throttling. This is consistent with the non-blocking peer-review note and should be treated as backlog hardening, not a QA blocker for the current gate.

---

## UX Issues

- No blocking UX reliability issue found in this pass.
- Error surfaces are present on the main async panels reviewed (`TransactionsPanel`, `MerchantRollups`, dashboard load path), and the prior stale-scope race noted in review has already been fixed.
- Known product limitation remains unchanged: desktop share is intentionally absent because `navigator.share` is mobile-only; this matches the documented limitation and is not a regression.

---

## Final QA Verdict

**PASS**

- Blocking findings: 0
- Medium findings: 0
- Low findings: 0
- Ready for next gated step: `/metric-plan`
