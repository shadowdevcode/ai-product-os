# Code Review — issue-010 MoneyMirror

**Date:** 2026-04-05
**Reviewer:** Codex
**Plan reference:** experiments/plans/plan-010.md
**Scope:** Phase 3 review pass after `/deslop`; focus on T1–T4 implementation and review-stage blockers before `/peer-review`

---

## Looks Clean

- Authenticated Phase 3 routes consistently gate on `getSessionUser()` and preserve the app’s session-cookie auth model.
- PostHog single-emission discipline holds for the new review-scope events: `transactions_view_opened`, `transactions_filter_applied`, `scope_changed`, `merchant_rollup_clicked`, `coaching_facts_expanded`, and `coaching_narrative_*`.
- Facts-grounded coaching still preserves the safe fallback path: rule-based advisory `message` remains available when Gemini output is absent or invalid.
- Transactions, merchant rollups, and scope parsing all retain server-side ownership checks for `statement_id` / `statement_ids`.

---

## Issues Found (Codex pass)

### Fixed in this pass

**[HIGH]** `apps/money-mirror/src/lib/dashboard.ts` — dashboard math was capped to the first 1000 transactions in scope.

- Impact: Overview totals, advisory inputs, and coaching facts could diverge from Transactions and merchant rollups for larger accounts or broader unified ranges.
- Fix applied: replaced row-limited dashboard math with full-scope SQL aggregates for category totals, debit/credit totals, heuristic signals, and `transaction_count`.

**[HIGH]** `apps/money-mirror/src/app/api/transactions/backfill-merchant-keys/route.ts` — merchant backfill could loop forever on rows whose `normalizeMerchantKey()` returns `null`.

- Impact: the route could repeatedly re-read unresolved `merchant_key IS NULL` rows until timeout.
- Fix applied: changed the batch walk to a forward cursor over a stable ordered snapshot and skip updates when the normalized key is `null`.

**[MEDIUM]** `apps/money-mirror/src/components/ScopeBar.tsx` — scope editor state drifted from the active URL scope.

- Impact: opening “Edit scope” on an existing unified view showed defaults and could silently overwrite the active range on re-apply.
- Fix applied: hydrate local scope form state from the parsed URL scope whenever the active scope changes.

### Residual observations

- Touched-file lint passes: `src/lib/dashboard.ts`, `src/app/api/transactions/backfill-merchant-keys/route.ts`, `src/components/ScopeBar.tsx`
- `npm test` passes.
- `npm run build` starts cleanly but was not observed to completion within this review session, so build status is not claimed as a verified pass from this artifact alone.

---

## Summary

- Files reviewed deeply in this pass: dashboard aggregation, transactions backfill, unified scope UI, review-stage telemetry/auth surfaces
- CRITICAL issues: 0
- HIGH issues: 2 (both fixed)
- MEDIUM issues: 1 (fixed)
- LOW issues: 0
- Codex verdict: **No remaining critical/high blockers from this pass**
- Workflow note: review stage remains open until the PM finishes any additional model review passes and ingests those findings before `/peer-review`

---

## Second Pass — Claude Code (Full Codebase Review)

**Date:** 2026-04-05
**Reviewer:** Claude Code (claude-sonnet-4-6)
**Scope:** 26 files across Phase 3 T1–T4. Full-pass review of all new API routes, lib modules, and components. The three Codex fixes (H1 dashboard math, H2 backfill loop, M1 scope URL drift) were confirmed resolved before this pass began.

---

### Looks Clean (second pass)

- Auth guard on every new route — `getSessionUser()` called before any data access on all 9 new API routes ✓
- Ownership enforcement in `/api/transactions` — `WHERE user_id = ${user.id}` in both single and multi-statement ownership checks ✓
- Input validation — date format (YYYY-MM-DD regex), UUID regex, category/type allowlists, search length cap, merchant_key length cap all enforced before DB ✓
- Atomic write preserved — `persist-statement.ts` fail-closed pattern unchanged ✓
- Cursor-based backfill pagination — `AND id > cursor ORDER BY id ASC LIMIT 500` terminates correctly ✓
- PostHog fire-and-forget — all server-side telemetry uses `.catch(() => {})` in hot paths ✓
- No PostHog dual-emission — `transactions_filter_applied`, `transactions_view_opened`, `scope_changed`, `coaching_facts_expanded`, `merchant_rollup_clicked`, `coaching_narrative_*` are server-side only ✓
- AbortController in TransactionsPanel — search and filter requests cancel in-flight fetches correctly ✓
- SessionStorage guard on view-opened — fires once per session, wrapped in try/catch ✓
- Gemini timeout at 9s — `TIMEOUT_MS = 9_000` with note explaining AbortSignal limitation ✓
- Zod schema validation on Layer A facts — `buildLayerAFacts` validates every row, full output validated via `layerAFactsSchema.parse()` ✓
- Citation validation — `validateCitedFactIds` ensures Gemini only cites fact IDs that exist in Layer A ✓
- No `console.log` in production code (only `console.error`) ✓
- No `any` types or `@ts-ignore` in reviewed files ✓
- No hardcoded secrets or API keys ✓
- Gemini JSON sanitization — strips markdown codeblocks before `JSON.parse` ✓
- Fan-out worker contract preserved — worker returns HTTP 502 on failure ✓

---

### Issues Found and Fixed (second pass)

**[HIGH] `advisory-engine.ts:100` — wrong per-year food delivery annualization for multi-month scopes**

- Impact: `food_delivery_paisa * 12` on a 3-month unified scope produced a 36× annual estimate (3× inflated); users saw incorrect ₹ figures in advisory cards.
- Fix applied: Dropped "That's ₹X per year" sentence entirely. Message now reads "…this period. Review how much of this was genuine necessity vs convenience."

**[HIGH] `DashboardClient.tsx:60-95` — `loadDashboard` had no AbortController**

- Impact: Rapid scope changes (e.g. Last 30d → This month → Last month) could produce a race where a slow Gemini-enriched response from an old scope resolved last and overwrote `result`, `advisories`, and `coachingFacts` with stale data.
- Fix applied: Added `dashboardAbortRef = useRef<AbortController | null>(null)`. Each `loadDashboard` call aborts the previous in-flight fetch, creates a new controller, passes `{ signal: ac.signal }` to `fetch`, and returns early on `AbortError`.

**[MEDIUM] Missing `Sentry.captureException` in 4 API catch blocks**

- Files: `api/dashboard/route.ts`, `api/dashboard/advisories/route.ts`, `api/transactions/route.ts`, `api/transactions/backfill-merchant-keys/route.ts`
- Fix applied: Added `import * as Sentry from '@sentry/nextjs'` and `Sentry.captureException(err)` before `console.error` in each catch block.

**[MEDIUM] Advisory copy wrong for multi-month unified scopes**

- `advisory-engine.ts:84` — Subscription headline said `₹X/mo in subscriptions` (`/mo` implied monthly when scope may span months).
- `advisory-engine.ts:111` — NO_INVESTMENT headline said "No investments detected this month" ("this month" wrong for multi-month or arbitrary date ranges).
- Fix applied: Headline → `₹X in subscriptions this period`; NO_INVESTMENT → "No investments detected in this period".

**[MEDIUM] N+1 UPDATE queries in `backfill-merchant-keys/route.ts`**

- Impact: 500 normalizable rows in a batch = 500 individual `UPDATE` round-trips. On large accounts this could exhaust the Vercel serverless timeout.
- Fix applied: Accumulates `(ids[], keys[])` arrays for the batch, then issues a single `UPDATE … SET merchant_key = data.key FROM unnest($ids::uuid[], $keys::text[]) AS data(id, key) WHERE …` per batch page.

**[MEDIUM] `DashboardClient.tsx` — 457 lines (exceeded 300-line limit)**

- Fix applied: Extracted all state, effects, memos, and handler callbacks to `useDashboardState.ts` hook. `DashboardClient.tsx` is now 159 lines (shell + JSX only). Repeated `ScopeBar + StatementFilters` block extracted to a local `scopeAndFilters` variable.

**[MEDIUM] `TransactionsPanel.tsx` — 342 lines (exceeded 300-line limit)**

- Fix applied: Extracted filter UI to `TxnFilterBar.tsx` (111L) and row renderer to `TxnRow.tsx` (61L). `TransactionsPanel.tsx` is now 166 lines.

**[LOW] Inline `<style>` tag for `@keyframes spin` in `DashboardClient.tsx`**

- Fix applied: Moved `@keyframes spin { to { transform: rotate(360deg); } }` to `globals.css`. Inline `<style>` tag removed.

---

### Verification

- `npm test`: 76/76 passed ✓
- `npm run lint`: 0 errors, 0 warnings ✓
- `npm run build`: clean build, TypeScript clean, all 23 routes compiled ✓

---

### Summary (second pass)

- Files reviewed: 26
- CRITICAL issues: 0
- HIGH issues fixed: 2
- MEDIUM issues fixed: 5
- LOW issues fixed: 1
- Verdict: **Review passes. Ready for `/peer-review`.**
