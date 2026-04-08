# Postmortem — issue-012 (MoneyMirror Gen Z clarity loop)

**Date:** 2026-04-07  
**Issue:** `experiments/ideas/issue-012.md`  
**Plan:** `experiments/plans/plan-012.md`  
**Key artifacts:** `experiments/results/review-012.md`, `experiments/results/peer-review-012.md`, `experiments/results/qa-test-012.md`, `experiments/results/metric-plan-012.md`, `experiments/results/deploy-check-012.md`

---

## Issue Observed

1. Review gate required **3 passes** before approval; initial implementation missed key correctness paths:
   - Guided-review `statement_id` ownership enforcement.
   - Cluster drill-through fidelity (single key instead of cluster scope).
   - Debit-only frequency aggregation.
   - Metric boundary correctness for advisory render timing.
   - Guided-review non-2xx submit handling (false success UI).
2. Deploy-check initially blocked due schema verification and env optionality ambiguity for WhatsApp relay keys.
3. Metric naming/ownership contract drift appeared in docs (`dashboard_ready` vs `dashboard_ready_ms`, `first_advisory_loaded` vs `time_to_first_advisory`), increasing analytics interpretation risk.

---

## Root Cause

1. `/execute-plan` implementation quality was strong but not fully guardrail-driven for **unhappy-path and semantic fidelity** acceptance criteria, so important logic was corrected late in `/review`.
2. Deploy protocol and env template semantics were not explicit enough at first pass (optional vs required key intent), causing avoidable gate friction.
3. Metric-plan artifact language did not enforce canonical event names strongly enough against implementation reality.

---

## Preventative Rule

1. Any new API that accepts an entity ID must prove **auth ownership** in-code and in tests before review starts.
2. Any aggregate drill-through UX must preserve aggregate semantics end-to-end (UI param -> API filter -> rendered set); fallback to first item is not acceptable.
3. Any completion flow must treat non-2xx as failure by default and keep retry UX visible.
4. Deploy-check env gates must classify optionality from `.env.local.example` comments deterministically; optional keys must be labeled in-file at definition site.
5. Metric-plan must reference only canonical event names that exist in code and annotate the single authoritative emitter.

---

## System Improvements

1. Add a pre-review "issue acceptance sweep" in `/execute-plan`: ownership, unhappy paths, and scope semantics for each new endpoint/component.
2. Add a code-review checklist item for "aggregate-to-detail fidelity" (cluster/category/totals drill-through must remain mathematically consistent).
3. Add a QA checklist item for non-2xx UI completion behavior on every new mutating UX surface.
4. Tighten deploy-check to treat explicit optional comments in `.env.local.example` as source of truth and require local labeling updates when optional behavior exists.
5. Require metric-plan output to include a canonical event dictionary cross-checked against implementation names before completion.

---

## Knowledge Updates

- `knowledge/engineering-lessons.md`
  - Add lessons on aggregate drill-through fidelity and non-2xx completion handling in user flows.
- `knowledge/product-lessons.md`
  - Add lesson on canonical metric/event naming consistency from plan to code.
- `knowledge/prompt-library.md`
  - Add postmortem snippet for "acceptance sweep" and "canonical event dictionary" patterns.

---

## Prompt Autopsy

Agent: `backend-engineer-agent`  
Missed: `POST /api/guided-review/outcome` accepted `statement_id` without ownership check in first pass.  
Root cause in prompt: No hard rule forcing ownership verification for optional foreign IDs on new write endpoints.  
Proposed fix: "For every write route that accepts an entity ID (`statement_id`, `order_id`, etc.), verify ownership with an authenticated lookup before any insert/update and return 404/403 on mismatch; add a test that fails cross-user access."

Agent: `frontend-engineer-agent`  
Missed: Cluster drill-through initially collapsed to one merchant key; guided-review submit initially treated non-2xx as success.  
Root cause in prompt: Missing explicit rule for aggregate drill-through semantics and default non-2xx handling contract.  
Proposed fix: "When a UI element represents an aggregate (cluster/category/rollup), drill-through must pass the full aggregate filter set to downstream routes; never substitute a single representative row. For form submissions, only transition to success state on `response.ok`; non-2xx must keep the user in-place with retryable error UI."

Agent: `code-review-agent`  
Missed: These issues were caught, but only after multiple passes; upfront checklist lacked explicit wording for aggregate fidelity and completion-path failure semantics.  
Root cause in prompt: Checklist not specific enough on aggregate->detail integrity and non-2xx completion-state correctness.  
Proposed fix: "Add mandatory checks: (1) aggregate-to-detail drill-through preserves full scope/filter semantics, (2) completion UIs do not mark success on non-2xx responses."

Agent: `deploy-agent` / `commands/deploy-check.md`  
Missed: First pass friction on env optionality labeling and schema verification path certainty.  
Root cause in prompt: Optional env classification relied on interpretation instead of explicit local annotations; schema verification fallback messaging was clear but auth/tooling path caused avoidable block churn.  
Proposed fix: "Treat `.env.local.example` inline optional markers as canonical; if optional behavior exists, require explicit `# Optional` comment adjacent to each key. During schema verification, if MCP auth fails, automatically attempt direct DB verification using configured app DB client before blocking."

Agent: `analytics-agent`  
Missed: Metric-plan used event labels that can drift from implemented canonical names (`dashboard_ready_ms` vs `dashboard_ready`, `time_to_first_advisory_ms` vs `first_advisory_loaded`).  
Root cause in prompt: No hard requirement to reconcile metric-plan naming against code-defined events.  
Proposed fix: "Before finalizing metric-plan, produce a canonical event dictionary sourced from implementation names and map each metric to exactly one canonical event name + emitter."

---

## Final Assessment

Issue-012 shipped with strong quality after review hardening, and deploy readiness passed. The primary systemic signal is not architecture failure but **late-cycle semantic correctness fixes** (ownership, aggregate fidelity, unhappy paths, telemetry naming consistency). The next cycle should push these checks earlier into execute-plan/review checklists.
