# Peer Review — issue-010 MoneyMirror Phase 3

**Date:** 2026-04-05  
**Scope:** Adversarial architecture review after `/review` (Codex + Claude Code). T1–T4 shipped; T5–T6 deferred per issue brief.  
**Inputs:** `experiments/results/review-010.md`, `experiments/ideas/issue-010.md`, `agents/peer-review-agent.md` Challenge Mode.

---

## Lens 1: Architecture & Scalability

**No blocking issues.**

- **Fit:** Monolith Next.js + Neon Postgres + session auth matches Phase 3 scope and expected user volume. Unified scope + SQL-backed aggregates (replacing row-capped client math) removes a real scalability ceiling for heavy accounts.
- **AI path:** Facts JSON (Layer A) → structured Gemini output with citation validation preserves a defensible boundary: amounts stay server-authoritative; model copy is constrained. Documented limitation: Google GenAI SDK does not cancel in-flight requests on timeout — timeout rejects to the caller but work may continue (cost/latency tail). Acceptable for MVP if monitored; not a ship blocker given 9s cap and rule-based fallback.
- **Complexity:** Phase 3 added several API surfaces (transactions, scope, insights, coaching expansion). The split into `useDashboardState`, `TxnFilterBar`, `TxnRow`, and lib modules is appropriate; no unnecessary microservices.

**Non-blocking observations**

- **Read-path cost:** `GET /api/transactions` and merchant insight routes can execute heavy `GROUP BY` / filtered scans for an authenticated user. Unlike `statement/parse`, there is no explicit rate limit on these reads. Cross-tenant abuse is mitigated by auth; self-DoS or cost amplification via rapid UI actions remains a product hardening item for a later slice (not blocking QA).

---

## Lens 2: Edge Cases, Security & Reliability

**No blocking issues.**

- **Auth:** Code review confirmed `getSessionUser()` before data access on new routes and ownership checks on `statement_id` / `statement_ids`.
- **Races:** Dashboard load uses `AbortController` to prevent stale scope overwrites — addresses the highest-risk client race called out in review-010.
- **Partial AI failure:** Coaching narrative failure paths return structured `ok: false` outcomes; rule-based `message` on advisories remains. PostHog server events use fire-and-forget `.catch(() => {})` on hot paths per anti-patterns.
- **Persistence:** `persist-statement` fail-closed pattern preserved from prior cycles.
- **Observability:** Sentry wired in dashboard/transactions/backfill catch blocks per second review pass.

**Non-blocking observations**

- **Merchant normalization:** Heuristic `merchant_key` will mis-bucket noisy descriptors; issue brief already flags parser variance — aligns with deferred deeper normalization (T5–T6 territory).
- **Backfill route:** Cursor-based batching + batched `unnest` UPDATE reduces timeout risk; still a privileged maintenance path — ensure it stays cron/admin-only in operations (verify deployment posture in `/qa-test`).

---

## Lens 3: Product Coherence & PM Alignment

**No blocking issues.**

- **Problem statement:** Unified date/source scope, transaction-native truth, merchant rollups, and facts-grounded coaching match `issue-010.md` desired outcome for T1–T4.
- **Deferred scope:** T5–T6 explicitly deferred — no spec drift in shipped code.
- **Telemetry:** New events are server-side single-emission for the review scope (`transactions_*`, `scope_changed`, `merchant_rollup_clicked`, `coaching_facts_expanded`, `coaching_narrative_*`). North Star proxy (e.g. second-month upload) remains a **`/metric-plan`** concern, not a peer-review gate failure.
- **Safety:** Generative path instructs no invented amounts, no ₹ in narrative, no securities advice — consistent with `docs/COACHING-TONE.md` direction.

**Non-blocking observations**

- **Perceived vs actual:** Plan/issue called out explicit PRD decision for global rollup; implementation follows blended “actual” + profile perceived baseline — consistent with documented plan; revisit if product wants per-account perceived later.

---

## Verdict: APPROVED

No blocking issues across the three lenses. Remaining items are **hardening and follow-ups** (read-path rate limits, merchant quality, metric-plan alignment), appropriate for **`/qa-test`** and **`/metric-plan`**, not for re-opening execute-plan.

---

## Challenge Mode (summary)

### Step 1 — Assumption audit (top 3)

| Assumption                                                | Risk                               | Mitigation in repo                                                            |
| --------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| Heuristic merchant keys are “good enough” for coaching    | Mis-ranked merchants, high “Other” | Known; exploration/issue callouts; T5–T6 deferred                             |
| Authenticated users won’t hammer expensive list endpoints | DB load / cost                     | Auth bounds cross-user abuse; per-user throttle not yet required for MVP gate |
| Gemini returns schema-valid JSON often enough             | Bad JSON / hallucination           | Zod + citation validation + timeout + fallback to rules                       |

Counterarguments are contained; none justify blocking QA.

### Step 2 — Anti-sycophancy

Approval is conditional on **no new evidence** of auth bypass or cross-tenant data leak; code review + this pass did not find one. If QA finds a route regression, reopen.

### Step 3 — Multi-perspective (min. one finding each)

- **Reliability (3am):** Gemini timeout without true abort — monitor p95 spend and consider queue/async coaching later if costs spike. _Non-blocking._
- **Adversarial user:** Session-only abuse of transactions API could stress own data; rate limit is product backlog. _Non-blocking._
- **Future maintainer:** `TIMEOUT_MS` + SDK abort note in `gemini-coaching-narrative.ts` — good; keep when upgrading `@google/genai`.

### Step 4 — Prompt autopsy (optional)

No mandatory agent-file edits required from this review. Suggested for **`/learning`** if reinforced:

- **File:** `agents/backend-architect-agent.md`  
  **Section:** Mandatory Pre-Approval Checklist  
  **Add:** "For finance dashboards with user-scoped heavy read APIs (aggregations, GROUP BY, unbounded filters), document either pagination/cursor guarantees, per-user rate limits, or explicit 'trusted client' assumption in the plan."

---

## Linear

- Root **VIJ-37** should receive **`/linear-sync status`** after this artifact and `project-state.md` update (peer-review PASS → still **Review** stage label until QA completes per linear-sync mapping).
