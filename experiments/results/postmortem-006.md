# Postmortem — Issue-006: Ozi Reorder Experiment

**Date**: 2026-03-21
**Stage**: postmortem
**Agent**: Learning Agent
**Input**: deploy-check-006.md (APPROVED), qa-test-006.md (PASS), peer-review-006.md (Pass 2, APPROVED), metric-plan-006.md, decisions log entries for issue-006

---

## Issue 1: Unprotected internal worker endpoint

**Issue Observed**: `/api/reorder-worker` accepted unauthenticated POST requests from any caller. Anyone with knowledge of the route could corrupt experiment cohort assignments, insert fake reminder rows, and pollute PostHog event counts — all critical North Star data.

**Root Cause**: The execute-plan agent implemented the worker as a pure HTTP endpoint without auth, treating "internal fan-out" as an implicit trust boundary. The backend-architect-agent's plan specified the fan-out pattern but did not mandate an auth header on the worker route. No architecture checklist item required auth on worker-style internal endpoints.

**Preventative Rule**: Any endpoint that mutates experiment data (cohorts, reminders, events, cron state) — regardless of whether it's "internal" to the system — must require auth. Use `CRON_SECRET` or a dedicated worker secret. Treat all POST endpoints as externally reachable.

**System Improvements**:
- `backend-architect-agent.md`: Add rule to Mandatory Pre-Approval Checklist — "Every API route that writes to experiment tables must specify its auth mechanism. 'Internal' is not an auth mechanism."
- `commands/execute-plan.md`: Add enforcement — "Before wiring any POST route, confirm its auth header requirement from the architecture spec. Worker routes without auth are a blocking violation."

**Knowledge Updates**: `knowledge/engineering-lessons.md`

---

## Issue 2: Double `order_placed` event emission

**Issue Observed**: `order_placed` fired from two sources — server-side in `/api/reorder-events/route.ts` (on order confirmation) and client-side in the reorder page via `useEffect`. The North Star metric was double-counted on every successful reorder, making the repeat purchase rate appear 2× higher than reality.

**Root Cause**: The engineer wired both server-side API tracking and client-side PostHog tracking for the same event without a single-source rule. The architecture plan defined the event but not its canonical emission point. No instruction exists that prohibits dual-emission for North Star events.

**Preventative Rule**: Each PostHog event that contributes to the North Star metric must have exactly one authoritative emission source — either client OR server, never both. If the server fires the event on API confirmation, all client-side re-firings of the same event name must be removed.

**System Improvements**:
- `commands/execute-plan.md`: Add rule — "For every PostHog event defined in the plan, identify one canonical emission point. North Star events fired server-side must not be re-fired client-side. Document the single source in an inline comment."
- `agents/code-review-agent.md`: Add check — "Verify that no PostHog event name appears in both a server-side API route and a client-side component. Dual-emission of North Star events is a critical violation."

**Knowledge Updates**: `knowledge/engineering-lessons.md`

---

## Issue 3: orderId in deep link was decorative — page fetched by userId instead

**Issue Observed**: The reorder deep link contained `/reorder/[orderId]`. The page used `orderId` from the URL but fetched the product by calling `getLastEssentialByUserId()` — a fallback lookup that returns the user's most recent essential order regardless of which order triggered the experiment. If a user placed a new order between the reminder trigger and clicking the link, the wrong product appeared.

**Root Cause**: The architecture plan defined `orderId` as the URL parameter and described a "pre-filled cart" experience, but did not specify the exact DB query: `SELECT * FROM mock_orders WHERE order_id = $orderId`. The engineer defaulted to the already-available `getLastEssentialByUserId()` helper, which was easier but semantically wrong. No architecture rule required that URL ID parameters be used as the primary lookup key.

**Preventative Rule**: When a URL parameter names a specific entity (orderId, reminderId, sessionId), the page or API handler must fetch that exact entity by that ID. Fallback-to-owner lookups corrupt experiment attribution and are never acceptable for experiment-instrumented flows.

**System Improvements**:
- `agents/backend-architect-agent.md`: Add to the plan output format — "For every URL with an entity ID parameter, specify the exact DB query: table name, WHERE clause, and the column used. Do not leave the lookup strategy implicit."
- `agents/peer-review-agent.md`: Add check — "For any experiment deep link, verify that the page fetches the specific entity by the ID in the URL. Flag any implementation that uses the URL ID only for display while querying by a different key (e.g., userId) for data."

**Knowledge Updates**: `knowledge/engineering-lessons.md`

---

## Issue 4: ControlGroupSimulator non-idempotent across page refresh

**Issue Observed**: `ControlGroupSimulator.tsx` disabled the button after one click using React component state (`status: "done"`). A full page reload reinstantiated the component as `idle`, allowing a founder to click again and fire `control_order_placed` a second time — inflating the control group conversion count and corrupting the North Star comparison.

**Root Cause**: The simulator was added during the peer-review fix cycle (to address the "no control conversion path" blocker) but was implemented with component state only. The `localStorage` deduplication pattern was already used elsewhere in the same codebase for `reminder_opened` (`ozi_reminder_opened_${reminderId}`), but the engineer did not apply it to the new component. The peer-review agent in Pass 1 reviewed the fix and approved it without checking that the idempotency guard survived page reload.

**Preventative Rule**: Any simulation or conversion tool that fires write-once PostHog events must be idempotent across page refreshes. React component state is insufficient. Apply the same `localStorage` keying pattern used for other one-time event guards in the same codebase (`localStorage.getItem(key)` on mount → disable button if key exists).

**System Improvements**:
- `agents/peer-review-agent.md`: Add to Step 5 Product Alignment — "For any demo simulation component that fires PostHog events, verify idempotency across full page reload — not just within the React lifecycle. Component state alone is insufficient. Check for localStorage guard or DB uniqueness constraint."
- `agents/backend-architect-agent.md`: Add to Dashboard & Reporting section — "Any demo simulation tool that fires write-once conversion events must specify both its UI deduplication pattern (localStorage keying) and its DB deduplication pattern (ON CONFLICT DO NOTHING) in the architecture spec."

**Knowledge Updates**: `knowledge/engineering-lessons.md`, `agents/peer-review-agent.md`

---

## Issue 5: PostHog `Promise.all` in worker throws on failure → 500, undercounts cron metric

**Issue Observed**: In `reorder-worker/route.ts`, `Promise.all([trackReminderTriggered(), trackReminderDelivered()])` propagated PostHog SDK exceptions up to the route handler. When PostHog was unavailable (e.g., missing `POSTHOG_KEY` during demo setup), the worker returned 500. The trigger's `Promise.allSettled` counted it as a failed worker, so `remindersSent` showed 0 on the dashboard even though all DB writes succeeded.

**Root Cause**: The QA2 pattern is a direct consequence of not individually try/catching PostHog calls before passing them to `Promise.all`. Engineering lesson from issue-003 (cron batching) established concurrent processing patterns but did not explicitly require per-call error isolation for telemetry within workers.

**Preventative Rule**: All PostHog server-side calls in worker routes must be individually wrapped in `try/catch` before being passed to `Promise.all` or `Promise.allSettled`. A PostHog failure must never cause a worker to return 500. Worker HTTP status must reflect the state of the DB write, not the telemetry write.

```typescript
// BAD — PostHog failure kills the worker
await Promise.all([trackReminderTriggered(data), trackReminderDelivered(data)]);

// GOOD — Telemetry failures are isolated
await Promise.allSettled([
  trackReminderTriggered(data).catch(e => console.error('PostHog triggered failed', e)),
  trackReminderDelivered(data).catch(e => console.error('PostHog delivered failed', e))
]);
```

**System Improvements**:
- `commands/execute-plan.md`: Add Telemetry Resilience Requirement — "PostHog server-side calls in worker routes must use `Promise.allSettled` with per-call `.catch()`. Telemetry failure must never cause worker HTTP 500. Worker response status = DB write result."
- `agents/qa-agent.md`: Add Failure Simulation test — "Simulate missing/invalid POSTHOG_KEY. Verify all workers return 200 and DB state is correct. PostHog failure must not corrupt `cron_runs` counters."

**Knowledge Updates**: `knowledge/engineering-lessons.md`

---

## Issue 6: README and `.env.local.example` incomplete at deploy-check (recurring)

**Issue Observed**: `deploy-check` was initially BLOCKED because `apps/ozi-reorder/README.md` was missing entirely and `.env.local.example` was missing three variables added during peer-review fixes (`DEMO_SECRET`, `NEXT_PUBLIC_DEMO_SECRET`, `EXPERIMENT_END_DATE`). This is the third consecutive project cycle where README completeness was a deploy-check blocker (issue-004, issue-005, issue-006).

**Root Cause**: The execute-plan command lists README creation as implied, but no explicit task exists requiring it. Environment variables added during fix cycles (post-execute-plan) are not tracked against `.env.local.example`. By the time deploy-check runs, the env file is stale. Despite being caught twice before, the pattern persists because no upstream instruction enforces it.

**Preventative Rule**: `README.md` and `.env.local.example` are mandatory deliverables of `/execute-plan`, not optional polish at `/deploy-check`. Every env var introduced at any pipeline stage (including fix cycles) must be added to `.env.local.example` in the same commit that introduces it.

**System Improvements**:
- `commands/execute-plan.md`: Add final checklist item — "Before marking execute-plan complete: (1) README.md exists in `apps/[project]` with one-liner, user journey, stack table, all env vars, schema apply step, endpoint docs, analytics event table, and design decisions. (2) `.env.local.example` lists every `process.env.*` reference in the codebase."
- `commands/deploy-check.md`: Keep README gate but add note — "If README or .env.local.example are missing at this stage, the failure was introduced during execute-plan. Flag it in the postmortem as a prompt failure of the execute-plan command."

**Knowledge Updates**: `knowledge/engineering-lessons.md`

---

## Issue 7: Error-path telemetry events absent (recurring)

**Issue Observed**: Three telemetry events needed for production observability were never wired during execute-plan: `reminder_trigger_failed` (per-user worker failure), `cron_run_completed` (cron observability), `experiment_ended` (experiment lifecycle). These were flagged by the metric-plan agent and deploy-check agent as "not demo blockers, required before production."

**Root Cause**: Error-path PostHog events are consistently deprioritized during implementation. A general telemetry-during-execute-plan rule exists in `engineering-lessons.md` (issue-004), and the execute-plan command was updated after issue-005 to include a Telemetry Completeness Requirement. However, that rule addressed happy-path events only. Error-path events (failure branches, lifecycle markers) are still not covered by any explicit instruction.

**Preventative Rule**: Telemetry completeness means happy-path AND error-path events. For every cron worker, wire: (1) per-user failure event in the catch block, (2) aggregate run-completed event after `Promise.allSettled`, (3) experiment lifecycle events at guard evaluations (end-date check, opt-out check). These are blocking requirements, not production-only.

**System Improvements**:
- `commands/execute-plan.md` Telemetry Completeness Requirement: Expand to — "Wire error-path events in every worker catch block. Wire lifecycle events at every guard evaluation. A cron worker with no failure event in its catch block is incomplete."
- `agents/qa-agent.md`: Add test — "Trigger a controlled worker failure. Verify a failure telemetry event fires. If it does not, fail QA."

**Knowledge Updates**: `knowledge/engineering-lessons.md`, `commands/execute-plan.md`

---

## Prompt Autopsy

### Agent: `execute-plan` command

**Missed**: C2 — double order_placed emission (client + server). QA2 — PostHog Promise.all without per-call try/catch. Error-path telemetry events absent (Issue 7).

**Root cause in prompt**: No rule prohibiting dual-emission of a single PostHog event. No rule requiring `Promise.allSettled` with per-call `.catch()` for telemetry in workers. Telemetry completeness rule covers happy-path events but not error-path events.

**Proposed fix**:
```
Add to commands/execute-plan.md:

## Single Emission Source Rule
Each PostHog event has exactly one authoritative emission point. If fired server-side
on API confirmation, it must not also be fired client-side. Dual-emission of any
event that contributes to the North Star metric is a critical violation.

## Telemetry Resilience Requirement (worker routes)
PostHog calls in cron workers must use Promise.allSettled with per-call .catch().
PostHog failure must never cause worker HTTP 500. Wire failure events in catch blocks.
Wire cron_run_completed after Promise.allSettled. Wire experiment lifecycle events
at every guard evaluation (EXPERIMENT_END_DATE, opt-out threshold).
```

---

### Agent: `backend-architect-agent`

**Missed**: C1 — no auth on worker endpoint. RR1 Pass 1 — URL orderId not used as DB lookup key. EC1 Pass 2 — ControlGroupSimulator idempotency not specified.

**Root cause in prompt**: Mandatory Pre-Approval Checklist requires rate limiting and sessionId ordering, but has no rule for worker endpoint auth or URL ID → DB lookup fidelity.

**Proposed fix**:
```
Add to agents/backend-architect-agent.md Mandatory Pre-Approval Checklist:

**Worker Endpoint Auth**: Every route that writes to experiment data tables must
specify its auth mechanism by name (CRON_SECRET, DEMO_SECRET, etc.). Listing a
route without an auth mechanism is a blocking omission.

**URL ID → DB Lookup Fidelity**: When a URL contains an entity ID parameter
(orderId, reminderId, sessionId), specify the exact DB query: table, WHERE clause,
and column. "Fetch by orderId" is insufficient — write the query.

**Simulation Tool Idempotency**: Any dashboard simulation component that fires
write-once PostHog events must specify both its UI deduplication strategy
(localStorage key) and its DB deduplication strategy (ON CONFLICT DO NOTHING).
```

---

### Agent: `peer-review-agent`

**Missed**: EC1 (ControlGroupSimulator non-idempotent across reload) was not caught in Pass 1 when the simulator was introduced as the fix for PA1. It was only caught in Pass 2 after implementation.

**Root cause in prompt**: Step 5 Product Alignment checks UX coherence, but has no specific rule for demo simulation tools. The simulator was reviewed as a feature, not as a write-once event emitter that must survive page reload.

**Proposed fix**:
```
Add to agents/peer-review-agent.md Step 5 Product Alignment:

For any demo simulation component that fires write-once PostHog events (e.g.
ControlGroupSimulator, control_order_placed), verify idempotency across full page
reload — not just within React lifecycle. Check: does it read localStorage on mount
and disable itself if the key exists? Component state alone is insufficient.
Apply the same deduplication pattern used for other one-time events in the same codebase.
```

---

### Agent: `qa-agent`

**Caught but too late**: QA2 (PostHog worker 500) was caught at QA stage, but by that point fixing it required revisiting the worker implementation. Earlier detection at code-review would have been lower cost.

**Root cause in prompt**: No QA failure simulation test for "telemetry service unavailable." QA tests happy-path PostHog firing but not PostHog SDK exception propagation.

**Proposed fix**:
```
Add to agents/qa-agent.md Failure Simulation section:

**Telemetry Unavailability Test**: Simulate PostHog unavailability (missing key,
invalid host, or mocked SDK rejection). Verify: (1) all workers return 200,
(2) DB state is correct, (3) cron_runs.reminders_sent reflects actual DB writes,
not PostHog call success. If worker returns 500 on PostHog failure, this is a
blocking QA finding.
```

---

## Summary Table

| # | Issue | Caught At | Should Have Been Caught At | Systemic Fix Target |
|---|---|---|---|---|
| 1 | Unprotected worker endpoint | /review (C1) | /create-plan | backend-architect-agent checklist |
| 2 | Double order_placed emission | /review (C2) | /execute-plan | execute-plan single-emission rule |
| 3 | orderId decorative (wrong DB lookup) | /peer-review Pass 1 (RR1) | /create-plan | backend-architect-agent URL ID rule |
| 4 | ControlGroupSimulator non-idempotent | /peer-review Pass 2 (EC1) | /peer-review Pass 1 | peer-review-agent simulation tool check |
| 5 | PostHog Promise.all throws → worker 500 | /qa-test (QA2) | /execute-plan | execute-plan telemetry resilience rule |
| 6 | README + .env.local.example missing (recurring) | /deploy-check | /execute-plan | execute-plan final checklist |
| 7 | Error-path telemetry absent (recurring) | /metric-plan + /deploy-check | /execute-plan | execute-plan telemetry completeness |

---

**Proceed to `/learning`.**
