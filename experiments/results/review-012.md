# Code Review — issue-012 MoneyMirror

**Plan reference:** `experiments/plans/plan-012.md`
**Manifest reference:** `experiments/plans/manifest-012.json`
**Workflow policy:** Review may contain multiple logged passes before `/peer-review` and `/qa-test`. Append new passes to this artifact instead of overwriting prior review history.

---

## Gate Status

- Current stage: `review`
- Gate status: `pass`
- Passes logged: 3
- Ready for `/peer-review`: Yes
- Ready for `/qa-test`: No

---

## Pass Log

### Pass 1

- Date: 2026-04-07
- Reviewer: Codex
- Model: GPT-5
- Command: `/review`
- Scope: issue-012 T0-T2 implementation under `apps/money-mirror`, with emphasis on plan conformance, ownership/auth on new routes, telemetry single-emission, frequency/cluster drill-through correctness, and dashboard critical-path behavior

#### Looks Clean

- `GET /api/insights/frequency-clusters` keeps the existing authenticated heavy-read pattern: `getSessionUser()` gate, per-user rate limit, unified-scope validation, and bounded top-merchant response size.
- The new guided-review storage path keeps persistence minimal (`guided_review_outcomes` only stores `user_id`, optional `statement_id`, `dismissed`, optional `commitment_text`, `created_at`) and the schema/index are mirrored in both [`schema.sql`](../../apps/money-mirror/schema.sql) and [`schema-upgrades.ts`](../../apps/money-mirror/src/lib/schema-upgrades.ts).
- New PostHog event names introduced for issue-012 are not dual-emitted across client and server. `dashboard_ready_ms`, `time_to_first_advisory_ms`, `frequency_insight_opened`, `merchant_cluster_clicked`, and `guided_review_started` are client-only; `guided_review_completed` and `commitment_saved` are server-only.
- T0 copy changes match the plan’s shame-safe direction: loading/empty/advisory states and the Gen Z / income-transition additions in [`docs/COACHING-TONE.md`](../../apps/money-mirror/docs/COACHING-TONE.md) are directionally aligned with the approved tone rules.

#### Issues Found

**[HIGH]** `apps/money-mirror/src/app/api/guided-review/outcome/route.ts:36` — `statement_id` is validated for UUID shape but never cross-checked against the authenticated user before insert. Any signed-in user can attach their guided-review outcome to another user’s statement UUID if they learn or guess it, which violates the plan’s “ownership enforced” acceptance criterion for the new API.
Fix: before insert, query `statements` for `id = statement_id AND user_id = current_user`; reject with `404` when the statement is absent or owned by someone else.

**[HIGH]** `apps/money-mirror/src/app/dashboard/InsightsPanel.tsx:95` — cluster drill-through drops multi-merchant clusters on the floor by rewriting the dashboard URL to a single `merchant_key` (`cluster.merchantKeys[0]`). For clusters like quick commerce or shopping, the user taps an aggregate row but only sees one merchant in Transactions, so the drill-through is not “scoped correctly” per the plan.
Fix: add a real cluster-scoped transaction filter (`cluster_id` or `merchant_keys[]`) and teach `/api/transactions` + `TransactionsPanel` to honor it, or remove the cluster drill-through CTA until the aggregate view is implemented.

**[MEDIUM]** `apps/money-mirror/src/lib/dashboard-helpers.ts:74` — frequency aggregation uses `amount_paisa > 0` instead of `type = 'debit'`. Credits/refunds with a populated `merchant_key` will be counted as “orders” and rolled into cluster totals, which distorts the new T1 frequency story.
Fix: filter on `type = 'debit'` in both query branches and simplify the sum to plain debit totals.

**[MEDIUM]** `apps/money-mirror/src/app/dashboard/DashboardClient.tsx:74` — `time_to_first_advisory_ms` fires as soon as the dashboard payload arrives, even when the user is still on the Overview tab and no advisory card has rendered. The plan defined this metric as time until the first advisory card is visible in the feed (or the explicit empty state is shown), so the current implementation records a different boundary and will understate the real time-to-insight.
Fix: move the emission to the Insights feed render boundary (or an explicit empty-state render callback) so the event matches the plan’s definition.

#### Summary

- Files reviewed: 16
- CRITICAL issues: 0
- HIGH issues: 2
- MEDIUM issues: 2
- LOW issues: 0
- Recommendation: Request Changes

#### Validation

- `npm test -- __tests__/api/frequency-clusters.test.ts __tests__/api/guided-review-outcome.test.ts src/lib/__tests__/merchant-clusters.test.ts` in `apps/money-mirror`: 29/29 passed

#### Pass Outcome

- Critical blockers remaining from this pass: 0
- High blockers remaining from this pass: 2
- Review status after this pass: blocked pending fixes
- Next recommended command: `/review` after fixes, then a second-model review pass using this artifact as context

### Pass 2

- Date: 2026-04-07
- Reviewer: Codex
- Model: GPT-5
- Command: `/review`
- Scope: re-review issue-012 changes after Pass 1 fixes, plus focused reliability checks on guided-review flow, frequency/cluster drill-through, telemetry emission boundaries, and auth ownership

#### Looks Clean

- Pass-1 ownership gap is fixed in `POST /api/guided-review/outcome`: when `statement_id` is present, the route now enforces `statements.id AND user_id` ownership before insert and returns `404` on mismatch.
- Cluster drill-through now preserves aggregate scope by writing `merchant_keys` to URL and both `TransactionsPanel` + `GET /api/transactions` honor this multi-key filter path.
- Frequency aggregation now correctly scopes to debit transactions only (`type = 'debit'`) in `fetchTopMerchantsByFrequency`, preventing refunds/credits from inflating repeat counts.
- `time_to_first_advisory_ms` now fires from the advisory feed render boundary via `InsightsPanel` callback and no longer fires from dashboard payload arrival.
- Focused verification passed: `npm --prefix apps/money-mirror test -- __tests__/api/guided-review-outcome.test.ts __tests__/api/frequency-clusters.test.ts src/app/dashboard/__tests__/InsightsPanel.test.tsx` (18/18).

#### Issues Found

**[HIGH]** `apps/money-mirror/src/components/GuidedReviewSheet.tsx:53` — the guided-review submit path treats every HTTP response as success (`setDone(true)` executes even when `/api/guided-review/outcome` returns 4xx/5xx). This can show a successful completion state and “commitment saved” messaging even when persistence failed, breaking the T2 guided-loop contract and creating silent data loss.
Fix: check `resp.ok` before setting completion state; on non-2xx show inline error and keep the user on Step 3 so they can retry.

#### Summary

- Files reviewed: 13
- CRITICAL issues: 0
- HIGH issues: 1
- MEDIUM issues: 0
- LOW issues: 0
- Recommendation: Request Changes

#### Validation

- `npm --prefix apps/money-mirror test -- __tests__/api/guided-review-outcome.test.ts __tests__/api/frequency-clusters.test.ts src/app/dashboard/__tests__/InsightsPanel.test.tsx`: 18/18 passed

#### Pass Outcome

- Critical blockers remaining from this pass: 0
- High blockers remaining from this pass: 1
- Review status after this pass: blocked pending fix
- Next recommended command: fix guided-review response handling, then run `/review` again before `/peer-review`

### Pass 3

- Date: 2026-04-07
- Reviewer: Codex
- Model: GPT-5
- Command: `/review`
- Scope: verify resolution of Pass 2 guided-review submit blocker and reconfirm issue-012 review gate readiness

#### Looks Clean

- `GuidedReviewSheet` now checks `response.ok` before setting completion state; non-2xx responses no longer transition to done.
- Non-success submission now keeps the user on Step 3 and shows retryable inline alert text (`Couldn't save yet. Please try again.`), preventing false-success UX.
- Added focused UI regression at `src/components/__tests__/GuidedReviewSheet.test.tsx` to assert non-2xx behavior (stay on Wrap up, show alert, do not render Review complete).
- Prior pass fixes remain intact: guided-review ownership check, `merchant_keys` drill-through, debit-only frequency aggregation, and advisory render-boundary timing event.

#### Issues Found

- None.

#### Summary

- Files reviewed: 7
- CRITICAL issues: 0
- HIGH issues: 0
- MEDIUM issues: 0
- LOW issues: 0
- Recommendation: Approve

#### Validation

- `npm --prefix apps/money-mirror run test -- src/components/__tests__/GuidedReviewSheet.test.tsx __tests__/api/guided-review-outcome.test.ts __tests__/api/frequency-clusters.test.ts src/app/dashboard/__tests__/InsightsPanel.test.tsx`: 19/19 passed

#### Pass Outcome

- Critical blockers remaining from this pass: 0
- High blockers remaining from this pass: 0
- Review status after this pass: pass
- Next recommended command: `/peer-review`
