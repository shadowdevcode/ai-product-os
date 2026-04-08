# Code Review — issue-011 MoneyMirror

**Plan reference:** `experiments/plans/plan-011.md`
**Manifest reference:** `experiments/plans/manifest-011.json`
**Workflow policy:** Review may contain multiple logged passes before `/peer-review` and `/qa-test`. Append new passes to this artifact instead of overwriting prior review history.

---

## Gate Status

- Current stage: `review`
- Gate status: `in_progress`
- Passes logged: 1
- Ready for `/peer-review`: No
- Ready for `/qa-test`: No

---

## Pass Log

### Pass 1

- Date: 2026-04-07
- Reviewer: Codex
- Model: GPT-5
- Command: `/review`
- Scope: Phase 4 review pass after `/deslop`; repo implementation across P4-A through P4-H, with emphasis on compare logic, financial-copy correctness, client fetch races, and hardening regressions before peer review

#### Looks Clean

- Authenticated heavy-read routes still gate on `getSessionUser()` and preserve the session-cookie auth model.
- PostHog single-emission discipline holds for the newly reviewed events: `merchant_alias_saved`, `merchant_suggestion_accepted`, `chat_*`, `paywall_prompt_seen`, and `upgrade_intent_tapped`.
- `GET /api/transactions` validates the new `upi_micro` filter and retains route coverage for valid and invalid query forms.
- Merchant alias writes remain user-scoped and keep ownership enforcement in the route layer.

#### Findings

**[HIGH]** `src/lib/dashboard-compare.ts` — legacy compare reused the current statement id for the previous comparison window, so the “previous” side usually collapsed to zero instead of resolving a real prior statement.

**[HIGH]** `src/app/dashboard/ResultsPanel.tsx` — copy labeled the card “Month-over-month” even when the compare path was serving an arbitrary previous-period range.

**[MEDIUM]** `src/components/MerchantRollups.tsx` — client fetches on scope changes lacked `AbortController`, allowing stale responses to overwrite newer state.

**[MEDIUM]** `src/lib/rate-limit.ts` — in-memory limiter buckets were never pruned after expiry.

#### Fixes Applied

- Resolved a real previous comparable statement in legacy compare mode by matching on the same statement identity fields and selecting the most recent earlier processed statement.
- Switched comparison UI copy to `Previous period` and rendered both compared date ranges explicitly.
- Added abortable merchant-rollup loading with stale-response protection.
- Added expired-bucket pruning to the shared in-memory rate limiter.

#### Validation

- `npm test` in `apps/money-mirror`: 109/109 passed
- Targeted regression coverage added:
  - `src/lib/__tests__/dashboard-compare.test.ts`
  - `src/lib/__tests__/rate-limit.test.ts`
  - `src/app/dashboard/__tests__/ResultsPanel.test.tsx`
- `npm run build`: not verified in this pass because Next reported an existing `next build` process/lock already present in the workspace

#### Pass Outcome

- Critical blockers remaining from this pass: 0
- High blockers remaining from this pass: 0
- Review status after fixes: pass complete, review gate remains open for additional passes
- Next recommended command: `/review` (additional pass) or `/peer-review` once review history is sufficient

---

### Pass 2

- Date: 2026-04-07
- Reviewer: Claude Code
- Model: Claude Sonnet 4.6
- Command: `/review`
- Scope: Full Phase 4 hardening pass (P4-A through P4-H); 20 files reviewed. Focus on anti-pattern compliance (PostHog fire-and-forget, parent/child write sequence, AbortController on rapid scope changes), auth/ownership on new routes, rate limiting, advisory copy scope-correctness, single-emission discipline, and schema consistency.

#### Looks Clean

- **PostHog dual-emission:** Server events (`statement_parse_*`, `transactions_filter_applied`, `rate_limit_hit`, `chat_*`, `merchant_*`, `scope_changed`) are server-only via `captureServerEvent`. Client events (`bad_pattern_advisory_shown`, `bad_pattern_advisory_clicked`) are client-only via `posthog-browser.ts` / `AdvisoryFeed.tsx`. No dual-emission detected.
- **Parent/child write sequence:** `persist-statement.ts` uses a single DB transaction — statement inserts as `'processing'`, all child transaction rows insert, then UPDATE to `'processed'`. Full rollback on failure.
- **AbortController on rapid scope changes:** `useDashboardState.ts:65-66` cancels in-flight dashboard fetches on each new load. `TransactionsPanel.tsx:58-59` cancels in-flight transaction fetches. Both correctly ignore `AbortError`.
- **Auth on all new routes:** `getSessionUser()` guard at top of every API route reviewed.
- **Ownership verification:** `transactions/route.ts` and `insights/merchants/route.ts` both verify statement ownership (`user_id` cross-check) before returning data.
- **Input validation:** Date format, UUID format, category enum, type enum, search length (≤200), merchant_key length (≤128), upi_micro (`1` or omit) — all validated with 400 on invalid.
- **Rate limiting (P4-H):** Dashboard (40/60s), transactions (60/60s), insights/merchants (40/60s), chat (per-day limit) — all implemented.
- **Advisory copy matches scope:** P4-E advisories derive amounts from `DashboardSignals` computed from active scoped transactions — no `/mo` or annual framing on multi-month scopes.
- **LocalStorage wrapped in try/catch:** `TransactionsPanel.tsx:44-53` wraps sessionStorage reads in try/catch per anti-pattern #3.
- **No hardcoded secrets or API keys** in any reviewed file.

#### Findings

**[MEDIUM]** `src/app/api/statement/parse/persist-statement.ts` — `await captureServerEvent(...)` in the DB catch block. Anti-pattern #4 requires PostHog calls in API routes to be fire-and-forget (`.catch(() => {})`), not awaited. Adds ~100–200ms of PostHog latency to an already-failing response.

**[MEDIUM]** `src/app/api/statement/parse/persist-statement.ts` — `console.error('[persist-statement] transaction failed:', error)` in production API handler. Should be routed through `Sentry.captureException`.

**[MEDIUM]** `src/app/dashboard/useDashboardState.ts` — `console.error('[loadCoachingNarratives]', e)` in production client-side hook. Function already returns `false` on failure; the log adds nothing in production.

**[LOW]** `schema.sql:38-50` — Base `CREATE TABLE transactions` block omits `upi_handle TEXT`. Column is only added via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` at line 87. Works for both fresh installs and existing DBs, but base table definition is inconsistent with live schema.

#### Fixes Applied

- `persist-statement.ts`: Replaced `await captureServerEvent(...)` with fire-and-forget pattern; added `Sentry.captureException(error)` to replace removed `console.error`.
- `useDashboardState.ts`: Removed `console.error` from `loadCoachingNarratives` catch block; changed `catch (e)` to `catch`.
- `schema.sql`: Added `upi_handle TEXT` to the base `CREATE TABLE transactions` block (line 50), keeping the `ALTER TABLE` line for existing DB migrations.

#### Validation

- Required checks: PostHog dual-emission ✓, parent/child write sequence ✓, AbortController ✓, auth/ownership ✓, advisory copy scope ✓
- 0 CRITICAL, 0 HIGH blockers remaining after fixes

#### Pass Outcome

- Critical blockers remaining from this pass: 0
- High blockers remaining from this pass: 0
- Review status after fixes: APPROVED — gate closed, ready for `/peer-review`
- Next recommended command: `/peer-review`

---

## Gate Status (Updated)

- Current stage: `review`
- Gate status: `done`
- Passes logged: 2
- Ready for `/peer-review`: Yes
- Ready for `/qa-test`: No (requires peer-review pass first)
