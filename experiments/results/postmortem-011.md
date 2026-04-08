# Postmortem — MoneyMirror Phase 4 (issue-011)

**Date:** 2026-04-07  
**Agent:** Learning Agent (per `commands/postmortem.md`)  
**Pipeline cycle:** issue-011 — P4-A through P4-H shipped; deploy-check **APPROVE**  
**Inputs:** `experiments/results/review-011.md`, `experiments/results/peer-review-011.md`, `experiments/results/qa-test-011.md`, `experiments/results/metric-plan-011.md`, `experiments/results/deploy-check-011.md`, `project-state.md`

---

## Executive summary

Phase 4 closed successfully: review, peer review, QA, metric-plan, and deploy-check all passed. The main systemic pattern is not broken functionality; it is **late discovery of operational and measurement constraints** that should have been explicit earlier in the cycle. Three gaps matter:

1. **Metric semantics drift**: `chat_query_submitted` was wired before the `GEMINI_API_KEY` availability guard, so “chat adoption” can include attempts in unavailable environments.
2. **PR automation was blocked late**: deploy-check approved runtime readiness, but automated PR creation failed because multiple files exceeded the repo’s 300-line policy and the pre-commit hook caught it only at the end.
3. **Hardening assumptions remained advisory**: in-memory rate limiting and Promise.race-without-abort were documented in plan/review/peer-review, but the architecture prompt still did not force a concrete disposition for authenticated heavy-read endpoints and paid-AI cancellation semantics.

This was a strong cycle technically, but the system still allows a class of “looks done until the final gate” misses. The right fix is prompt and workflow tightening, not code churn.

---

## Issue PM-1 — Chat telemetry overstated usable chat demand

**Issue Observed:**  
`chat_query_submitted` fires before the `GEMINI_API_KEY` availability check in `/api/chat`, so environments where chat is unavailable can still record attempted usage as if the chat funnel started normally.

**Root Cause:**  
Metric planning and implementation treated event wiring as present/absent, but did not require an explicit distinction between **attempted action** and **available/servable action**. The event name was semantically stronger than the actual condition under which it fired.

**Preventative Rule:**  
Any telemetry event used in a funnel must specify its **eligibility condition**. If a feature can be disabled or unavailable by env/config, the plan must either:

- emit the event only after availability is confirmed, or
- record a separate availability property/event so attempted demand and successful entry are separable.

**System Improvements:**

- `analytics-agent.md`: Require availability semantics for each funnel event, not just event names.
- `commands/execute-plan.md`: Add a checklist item that event names and emission points must match runtime reality, especially for env-gated features.
- `code-review-agent.md`: Add a telemetry semantics check for “event name promises more than the code guarantees.”

**Knowledge Updates:** `engineering-lessons.md`, `product-lessons.md`, `prompt-library.md`

---

## Issue PM-2 — File-size policy surfaced too late and blocked PR automation

**Issue Observed:**  
Deploy-check approved production readiness, but PR automation still failed because husky enforced the repo’s 300-line file limit and four files exceeded it:

- `ResultsPanel.tsx`
- `MerchantRollups.tsx`
- `advisory-engine.ts`
- `dashboard-compare.ts`

**Root Cause:**  
The file-size rule exists in `.claude/rules/code-quality.md`, but it still functioned as a **late mechanical gate** instead of an active generation constraint during implementation and cleanup. `/deslop` improved structure, but the workflow did not explicitly require a pre-commit file-size audit before `/review` or `/deploy-check`.

**Preventative Rule:**  
Mechanical code-quality limits that can block commit or PR creation must be checked **before** review is considered complete. A cycle is not “PR-ready” if the repo’s commit hooks will reject the staged diff.

**System Improvements:**

- `commands/execute-plan.md`: Add a required file-size audit against repo policy before marking execute-plan complete.
- `agents/deslop-agent.md`: Require explicit splitting of files projected to exceed the repository line-limit instead of treating readability cleanup as optional polish.
- `commands/deploy-check.md`: Before attempting PR automation, add a preflight step: run the same file-size gate the commit hook enforces and classify violations as a release-workflow blocker, not a surprise at PR time.

**Knowledge Updates:** `engineering-lessons.md`, `prompt-library.md`

---

## Issue PM-3 — Architecture still allowed non-final hardening decisions to drift downstream

**Issue Observed:**  
Two concerns stayed non-blocking but surfaced repeatedly downstream rather than being resolved at architecture time:

- authenticated heavy-read routes use in-memory best-effort throttles only
- chat timeout returns 504 via `Promise.race`, but the underlying Gemini request is not truly aborted

Neither blocked release, but both appeared in plan, peer review, QA, and metric considerations.

**Root Cause:**  
The architecture prompt already covers unauthenticated paid-API rate limits and generic AI timeout behavior, but it does not force a **final declared posture** for:

- authenticated heavy-read cost/abuse control
- whether timeout handling is UX-only or true upstream cancellation

This leaves the system vulnerable to “known but unclosed” technical assumptions moving through multiple gates.

**Preventative Rule:**  
For any heavy authenticated read endpoint or paid-AI route, architecture must explicitly classify the operational posture as one of:

- production-grade control now,
- MVP best-effort with stated limitation and monitoring signal,
- deferred follow-up blocked from claiming stronger semantics.

If the timeout path does not actually abort upstream work, the plan must say so explicitly and define the accepted tradeoff.

**System Improvements:**

- `backend-architect-agent.md`: Extend the mandatory checklist with a required disposition for authenticated heavy-read abuse control and true-vs-soft AI timeout behavior.
- `peer-review-agent.md`: Keep flagging these, but focus on whether the architecture explicitly declared the tradeoff rather than rediscovering it ad hoc.
- `qa-agent.md`: When a timeout is implemented with `Promise.race`, explicitly record whether upstream cancellation is real or only client-visible.

**Knowledge Updates:** `engineering-lessons.md`, `prompt-library.md`

---

## Issue PM-4 — Deploy approval and PR readiness are still partially decoupled

**Issue Observed:**  
`/deploy-check` could legitimately return **APPROVE deployment readiness** while the automated PR creation step remained incomplete because commit hooks blocked the commit.

**Root Cause:**  
The command and workflow treat production readiness and repository handoff as part of the same stage, but the criteria are not fully harmonized. Runtime readiness passed; repo-policy readiness did not.

**Preventative Rule:**  
If `/deploy-check` includes automated PR creation as a blocking gate, then all known repository-policy blockers to commit/PR creation must be checked inside the command before the final recommendation is emitted.

**System Improvements:**

- `commands/deploy-check.md`: Distinguish two outcomes clearly if needed:
  - deployment readiness
  - repo handoff readiness (commit/PR automation)
- Or, if keeping one final verdict, then include commit-hook preflight as a mandatory gate before “APPROVE.”

**Knowledge Updates:** `prompt-library.md`

---

# Knowledge Updates (summary)

| File                     | Topics                                                                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `engineering-lessons.md` | Funnel-event availability semantics; early file-size gate enforcement; explicit authenticated-heavy-read posture; true-vs-soft timeout declaration |
| `product-lessons.md`     | Metric definitions must separate attempted demand from available feature usage                                                                     |
| `prompt-library.md`      | Deploy approval vs PR-readiness alignment; issue-011 cycle summary                                                                                 |

---

# Prompt Autopsy (required)

**Agent:** `analytics-agent`  
**Missed:** Did not require that funnel events distinguish between feature availability and user demand, allowing `chat_query_submitted` to overstate usable chat adoption.  
**Root cause in prompt:** The agent defines events and funnels, but never asks for the exact runtime condition under which an event is emitted.  
**Proposed fix:** Add to Event Tracking: _“For every funnel event, specify the runtime eligibility condition that must be true before the event fires (for example: feature enabled, provider configured, auth present). If a feature can be unavailable by env/config, define separate measurement for attempted demand vs available usage.”_

---

**Agent:** `backend-architect-agent`  
**Missed:** Did not force a declared operational posture for authenticated heavy-read throttles or clarify whether AI timeout handling meant true request abort vs client-visible timeout only.  
**Root cause in prompt:** Current checklist covers unauthenticated paid API rate limits and generic timeout behavior, but not the explicit tradeoff for authenticated heavy-read routes or soft timeout semantics.  
**Proposed fix:** Add to Mandatory Pre-Approval Checklist: _“For every authenticated heavy-read endpoint, specify the abuse/cost posture explicitly: shared-store rate limit, in-memory best-effort throttle, or no throttle with documented MVP assumption. For every AI timeout path, specify whether the upstream request is truly aborted or only the client response times out; if abort is not real, document the accepted cost tradeoff.”_

---

**Agent:** `deslop-agent`  
**Missed:** Did not fully normalize oversized files before the repo’s mechanical line-limit gate became a commit blocker.  
**Root cause in prompt:** Deslop focuses on readability and hallucination cleanup, but does not explicitly treat repository size limits as mandatory cleanup targets before review/deploy.  
**Proposed fix:** Add to responsibilities: _“Before marking deslop complete, check all touched files against repo mechanical limits (especially file-length caps). If any touched file exceeds policy, split it during deslop rather than deferring the failure to commit hooks or deploy-check.”_

---

**Agent:** `deploy-agent` / command `commands/deploy-check.md`  
**Missed:** Approved deployment readiness while PR automation remained blocked by commit-hook policy.  
**Root cause in prompt:** The stage includes PR creation as a blocking gate, but the process does not require a preflight check against the same repository-policy rules enforced by the commit hook.  
**Proposed fix:** In `commands/deploy-check.md`, add: _“Before attempting commit/PR automation, run the same repository policy preflight enforced by local hooks (file-size limits and other commit blockers). A hook failure is a blocking deploy-check finding for repo handoff readiness and must be reported before final approval.”_

---

**Agent:** `code-review-agent`  
**Missed:** Did not challenge whether event names matched runtime truth for env-gated chat availability.  
**Root cause in prompt:** Review checks correctness of event presence and dual-emission, but not semantic accuracy between event name and the condition under which it fires.  
**Proposed fix:** Add to telemetry review: _“Verify that event names and funnel placement match runtime truth. If an event implies a usable feature step (‘submitted’, ‘started’, ‘completed’), confirm the feature was actually available at the point of emission.”_

---

# Next pipeline command

Per `system-orchestrator.md`: **`/learning`** — convert this postmortem into durable knowledge and prompt updates.
