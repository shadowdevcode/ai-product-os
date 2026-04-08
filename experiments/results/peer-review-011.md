# Peer Review — issue-011 (MoneyMirror Phase 4)

**Date:** 2026-04-07  
**Command:** `/peer-review`  
**Plan:** `experiments/plans/plan-011.md`  
**Prior code review:** `experiments/results/review-011.md` (2 passes, APPROVED)

---

## Prerequisites

- `review` quality gate: **PASS** (two passes logged).
- Input: architecture and implementation as shipped in `apps/money-mirror` (P4-A through P4-H).

---

## Challenge mode (summary)

### Assumption audit (three dangerous assumptions)

1. **In-memory per-user rate limits are an adequate abuse control on Vercel.**  
   **Risk:** Limits are per warm instance and reset on cold start; sophisticated abuse can fan across regions/instances.  
   **Failure mode:** Effective budget for heavy reads/chat is higher than the documented cap; cost and DB load spike before ops notices.  
   **Assessment:** Acceptable for Phase 4 MVP if treated as best-effort throttle + `rate_limit_hit` signal, not a hard SLA. Not a release blocker.

2. **Promise.race on chat/coaching equals “timeout handled.”**  
   **Risk:** Underlying Gemini HTTP request is not aborted; work and billing can continue after the client receives 504.  
   **Failure mode:** Higher Gemini cost and tail latency under load than dashboards suggest; aligns with plan-011 “follow-up true HTTP abort” for P4-H.  
   **Assessment:** Known gap vs plan language; non-blocking if backlog explicitly owns abort/upstream cancellation.

3. **Layer A facts + capped transactions fully ground chat.**  
   **Risk:** User questions may target txns outside the last 20 rows or non-fact nuance; model may over-generalize.  
   **Failure mode:** Occasional unsatisfying or vague answers; mitigated by validation of `cited_fact_ids` and 502 on invalid JSON.  
   **Assessment:** Matches facts-only spec; acceptable with UX copy that scope is “recent + summary facts.”

### Multi-perspective (abbreviated)

- **Reliability engineer:** In-memory limiter + fluid compute restarts → limit drift; chat timeout without abort → wasted work.
- **Adversarial user:** Multi-instance bypass of read/chat limits; not catastrophic for authenticated app (not public DDoS surface).
- **Future maintainer:** `CODEBASE-CONTEXT.md` “Known Limitations” still mentions heavy reads without per-user throttle — **documentation drift** vs current `rate-limit.ts` usage on dashboard/transactions/merchants.

---

## Lens 1: Architecture & Scalability

**Findings**

- **Monolith + route-level ownership** remains appropriate for the product scope; Phase 4 additions (aliases, suggestions, compare, chat, proactive stubs) stay within the existing Neon-auth + server-enforced ownership model.
- **P4-A merchant enrichment** uses a bounded cron (`MAX_KEYS_PER_RUN = 6`) and keeps Gemini off the upload path — correct separation of concerns. Throughput will lag if suggestion backlog explodes; acceptable for MVP, monitor queue depth.
- **Heavy-read rate limits** are implemented (`dashboard`, `transactions`, `insights/merchants`) with `rate_limit_hit` telemetry — satisfies the intent of P4-H for authenticated abuse, with the known serverless caveat that limits are not globally consistent across instances.

**Blocking issues:** None.

---

## Lens 2: Edge Cases, Security & Reliability

**Findings**

- **Auth:** New user-facing routes use `getSessionUser()`; cron routes use shared secret pattern consistent with existing recap cron.
- **Chat:** Response validation (`cited_fact_ids` ⊆ allowed facts, non-empty answer) closes the main hallucination-number path; JSON markdown stripping matches engineering-lessons guidance for LLM JSON.
- **Chat timeout:** `Promise.race` returns 504 to the client but does not cancel the Gemini request — reliability/cost concern, not a user-data integrity bug.
- **Merchant-enrich:** Failed Gemini suggestions do not insert rows; candidates can reappear next run — potential hot-loop on permanently bad keys; low probability, consider DLQ/retry cap later.
- **Proactive WhatsApp:** Provider failure returns 502; stub mode returns 200 with clear payload — OK. Telemetry fires once per opt-in attempt with `provider_configured` — interpretable.

**Blocking issues:** None.

---

## Lens 3: Product Coherence & PM Alignment

**Findings**

- **Issue + plan alignment:** Merchant/UPI visibility, bad-pattern advisories, URL tabs + compare, paywall prompt hooks, facts-only chat with citations, proactive opt-in endpoints, and read-path rate limits are present and traceable to `issue-011` / `plan-011`.
- **Telemetry:** Single-source discipline for server vs client events is preserved per code review. **Minor:** `chat_query_submitted` is emitted before the `GEMINI_API_KEY` check, so environments without chat configured can still record “query submitted” followed by 503 — slightly inflates “chat adoption” funnels unless filtered by environment or event order is adjusted (recommended follow-up, not a peer-review gate blocker).
- **Docs:** `CODEBASE-CONTEXT.md` should be refreshed to remove the outdated “no per-user throttle on heavy reads” limitation (implementation now includes `checkRateLimit` on those routes).

**Blocking issues:** None.

---

## Verdict: **APPROVED**

No blocking issues across the three lenses. Recommended non-blocking follow-ups:

| Area          | Recommendation                                                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P4-H / Gemini | Add true request abort or SDK cancellation for chat (and any remaining `Promise.race`-only paths) when product prioritizes cost control.                  |
| Analytics     | Emit `chat_query_submitted` only after confirming chat is available, or add a property `chat_available: boolean` / separate event for “chat unavailable.” |
| Docs          | Update `CODEBASE-CONTEXT.md` known limitations to reflect heavy-read rate limits.                                                                         |
| Scale         | If user volume grows, replace in-memory limiter with shared store (Redis/Upstash) or edge rate limiting.                                                  |

---

## Pipeline

- **Next command:** `/qa-test`
- **Linear:** `/linear-sync status` recommended to mirror peer-review gate on **VIJ-43**.
