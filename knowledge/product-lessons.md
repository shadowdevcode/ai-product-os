# Product Lessons

This file stores durable product and process rules extracted from postmortems.

The Learning Agent appends to this file after every completed pipeline cycle.

Agents must read this file before generating product specs, exploration reports, or planning outputs.

---

# Format

Each lesson follows this structure:

---

date: YYYY-MM-DD
project: <project_name>
issue: <one-line description>
root_cause: <why it happened>
rule: <generalizable rule that prevents recurrence>
improvement: <what to change in product or planning agents>

---

---

# Lessons

<!-- Learning Agent appends below this line -->

---

date: 2026-03-07
project: Gmail Summary to WhatsApp Notifier (issue-002)
issue: Metric plan was executed as a final pre-deploy step, meaning all telemetry was bolted on after feature completion rather than built in during development
root_cause: The pipeline placed /metric-plan at stage 9, after all code was written and reviewed. This made analytics an afterthought rather than part of the initial implementation contract.
rule: Analytics and telemetry event definitions must be reviewed immediately after /create-plan, before any code is written. The metric plan does not need to be formally executed yet, but the events to track must be listed in the implementation spec so engineers instrument them during feature development.
improvement: Product Agent must include a required Instrumentation section in every plan that lists the minimum viable events to track (e.g., signup, core_action_completed, error_occurred). Execute Plan agent must implement these events as part of the feature build, not as a separate later task.

---

---

date: 2026-03-07
project: Gmail Summary to WhatsApp Notifier (issue-002)
issue: "Feature complete" was declared and QA was initiated before telemetry was validated, creating a false sense of readiness
root_cause: The definition of done for execute-plan did not include telemetry instrumentation. There was no quality gate checking that at least the minimum required events were implemented before advancing to review.
rule: A feature is not complete until the minimum instrumentation events are implemented. Telemetry is part of the definition of done, not a post-launch addition.
improvement: Code Review agent must include a telemetry verification step — confirming that events specified in the plan's Instrumentation section are present in the implementation — before approving the review gate.

---

---

date: 2026-03-07
project: Gmail Summary to WhatsApp Notifier (issue-002)
issue: Spammy fallback alerts were sent continuously to users during simulated AI service outages
root_cause: The system defaulted to a generic fallback WhatsApp alert when the Gemini API was unreachable, but failed to impose a frequency cap. A prolonged outage would result in the user being repeatedly messaged every cron cycle, deteriorating trust.
rule: Any automated fallback user communication or generic functional alert sent during a service degradation must incorporate strict frequency caps or a silent-fail threshold to prevent user spamming.
improvement: Product Agent must explicitly define maximum engagement frequency and specific backoff constraints for fallback/error paths in all product specifications involving user notifications.

---

---

date: 2026-03-08
project: AI Personal Finance Advisor (issue-003)
issue: The conversational UX failed when users sent non-text messages (like images) or 0-spend reports, triggering error paths instead of contextual guidance.
root_cause: Narrow "Happy Path" testing and planning that assumed unstructured conversational interfaces behave like strict HTML forms.
rule: Every webhook or conversational interface that accepts unstructured user input must implement explicit handlers for 1) Unrecognized Media Types (image, audio, document) and 2) Boundary Values (zero, negatives).
improvement: Product Agent must clearly define the fallback UX for explicit edge cases (non-text payload, zero values) in the core specification. Peer Review Agent must actively challenge the design by generating an explicit "Adversarial Edge Case List".

---

---

date: 2026-03-11
project: Project Clarity (issue-004)
issue: Synchronous AI API failures resulted in complete data loss of user inputs (thoughts).
root_cause: The application lacked a resilient fallback strategy for when the primary AI categorization service timed out or returned an error.
rule: User input must never be lost due to third-party service failures. AI-driven products must implement strict fallback states (e.g. assigning a default "Uncategorized" label and saving raw text) to prioritize zero data loss.
improvement: Product Agent must define a "Graceful Degradation" or "Fallback State" spec for any feature relying on synchronous external AI processing.

---

date: 2026-03-28
project: Nykaa Hyper-Personalized Style Concierge (issue-008)
issue: North Star metric (Add-to-Cart rate lift) was defined in the product spec and metric plan, but the MVP UI only covered shelf and search listing — no PDP or Add-to-Cart button was built, making the primary success metric unmeasurable.
root_cause: Product specification and architecture review did not cross-validate that every defined success metric had a corresponding user flow in the MVP scope. Metrics were defined aspirationally, not grounded in the implementation plan.
rule: Every success metric in a product specification must map to an explicit, buildable user flow within the committed MVP scope. If a metric requires a UI action (e.g., Add to Cart, Upgrade, Purchase) that is not in scope, either (a) descope the metric and replace with a measurable proxy, or (b) expand the MVP scope to include the action. Aspirational metrics without measurement paths must be flagged as "deferred" and excluded from the experiment success criteria.
improvement: Product Agent must include a "Metric → Flow Mapping" table in every product spec, with columns: Metric Name | Required User Action | UI Component | API Endpoint | In Scope? Any row with In Scope = No is a blocking gap that must be resolved before the plan exits /create-plan.

---

---

date: 2026-04-05
project: MoneyMirror Phase 3 (issue-010)
issue: Analytics and coaching copy defaulted to monthly language while the product shipped unified multi-month and arbitrary date ranges
root_cause: PRD and UX templates did not require period-neutral phrasing when the date range is user-configurable.
rule: If the product supports arbitrary or multi-month ranges, default user-facing analytics copy must use period-neutral labels ("this period", "in your selected range") unless the UI is explicitly single-month scoped. Time-rate phrases (/mo, per year, this month) require explicit scope semantics in the spec.
improvement: Product Agent and Design Agent must add a Scope → Copy contract section for any feature with configurable date ranges: which phrases are allowed per scope shape (single calendar month vs multi-month vs custom range).

---
