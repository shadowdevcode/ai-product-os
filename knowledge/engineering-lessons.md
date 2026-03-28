# Engineering Lessons

This file stores durable engineering rules extracted from postmortems.

The Learning Agent appends to this file after every completed pipeline cycle.

Agents must read this file before generating architecture, implementation, or review outputs.

---

# Format

Each lesson follows this structure:

---

date: YYYY-MM-DD
project: <project_name>
issue: <one-line description>
root_cause: <why it happened>
rule: <generalizable rule that prevents recurrence>
improvement: <what to change in agents or commands>

---

---

# Lessons

<!-- Learning Agent appends below this line -->

---

date: 2026-03-07
project: Gmail Summary to WhatsApp Notifier (issue-002)
issue: Unbounded Gmail pagination loop caused Vercel 504 timeouts during QA
root_cause: Architecture plan did not specify a lookback window or maximum page limit for external API fetching loops. The assumption that default pagination would self-terminate was incorrect.
rule: Every external API fetch loop must implement two hard constraints before any other logic — a maximum page count (e.g., 5 pages) and a temporal bound (e.g., newer_than:30d). These are non-negotiable even in MVP.
improvement: Backend Architect agent must include explicit pagination limits and temporal bounds in all architecture plans that involve syncing external data. Code Review agent must flag any while/for loop over a network call that lacks both a page cap and a date bound.

---

---

date: 2026-03-07
project: Gmail Summary to WhatsApp Notifier (issue-002)
issue: AI summaries were low quality because only the Gmail snippet (200 chars) was passed to the LLM instead of the full email body
root_cause: The plan assumed the default messages.list snippet would provide sufficient context for generative summarization. This was not validated against how LLMs actually require full text payloads.
rule: Any AI summarization integration must explicitly fetch and pass the full text/plain or text/html payload of each item. Metadata snippets or previews must never be used as primary LLM input.
improvement: Backend Architect agent must call out the specific payload fields required for each AI integration in the plan. Execute Plan agent must not default to snippet fields when full body fields exist.

---

---

date: 2026-03-07
project: Gmail Summary to WhatsApp Notifier (issue-002)
issue: Master cron job processed all users synchronously inside a single Vercel function, coupling total runtime to user count and hitting the 5-minute timeout ceiling
root_cause: The initial cron architecture treated user processing as a batch operation rather than a fan-out trigger. The architecture did not account for serverless execution time limits.
rule: Any scheduled worker that triggers per-user or per-entity operations must use a fan-out architecture — the master cron fires N independent async invocations, one per entity. The master cron must not contain heavy processing logic itself.
improvement: Backend Architect agent must flag any architecture that processes a list of users inside a single cron function and require a decoupled worker pattern instead. QStash, background jobs, or parallel HTTP triggers are the acceptable patterns.

---

---

date: 2026-03-07
project: Gmail Summary to WhatsApp Notifier (issue-002)
issue: Transient Twilio errors permanently suspended user accounts because all third-party errors were treated identically
root_cause: Error handling treated all non-2xx responses from messaging APIs as permanent failures, triggering is_active = false without checking whether the error was recoverable.
rule: Third-party API error handling must distinguish between permanent errors (e.g., invalid number, 404) and transient errors (e.g., rate limit, sandbox restriction, 503). Account-level consequences like suspension must only trigger on permanent, confirmed errors.
improvement: Backend Engineer agent must implement error classification for all third-party integrations before writing the error handling block. Code Review agent must verify that account suspension logic is guarded by error type, not error existence.

---

---

date: 2026-03-07
project: Gmail Summary to WhatsApp Notifier (issue-002)
issue: Supabase schema was never pushed to the remote instance before deploy-check, causing the deploy gate to fail on an entirely empty database
root_cause: The architecture plan assumed schema.sql would auto-sync. Supabase requires explicit execution via CLI link or manual SQL editor. This was not listed as a deploy prerequisite in the deploy-check command.
rule: Database schema initialization against the production or staging URI must be a mandatory, explicit checklist item in deploy-check. The deploy gate cannot pass unless table existence is verified, not assumed.
improvement: Deploy Agent must include a schema verification step — confirming all expected tables exist in the remote DB — as the first item in the deploy-check sequence, before any compilation or build checks.

---

---

date: 2026-03-07
project: Gmail Summary to WhatsApp Notifier (issue-002)
issue: Failed AI Summaries created an infinite retry loop for specific unprocessable emails
root_cause: The pipeline correctly skipped marking emails as processed on AI failure, but didn't track the number of failed attempts per email. This caused it to continually attempt to process the exact same "poison pill" content every cron run if the LLM constantly choked on it.
rule: Data processing queues that iterate over specific external entities must implement a dead-letter queue (DLQ) or a permanent skip/failure counter per item to prevent infinite retry loops on unprocessable structures.
improvement: Backend Engineer agent must implement per-item retry limits and failure tracking for any automated processing pipeline that operates on external payloads.

---

---

date: 2026-03-08
project: AI Personal Finance Advisor (issue-003)
issue: WhatsApp replies were terminating abruptly because the `sendWhatsAppMessage` promise was fired off synchronously inside the serverless webhook before the Next.js API returned 200.
root_cause: Serverless environments (like Vercel) suspend background execution immediately after the HTTP response is sent, silently killing unawaited network requests.
rule: Every async API call or Background operation made inside a serverless API route or edge function must be explicitly `await`ed or resolved using `waitUntil` before returning the HTTP response. Do not use fire-and-forget patterns.
improvement: Code Review Agent must enforce explicit `await` on all external sdk/fetch calls inside API routes, especially for notification services.

---

---

date: 2026-03-08
project: AI Personal Finance Advisor (issue-003)
issue: The cron endpoints executed N+1 database queries, iterating users one-by-one and awaiting individual sequential queries and API calls inside loops.
root_cause: Defaulting to single-user CRUD operations resulting in extreme execution duration, violating serverless timeout limits.
rule: Cron jobs that process collections of entities MUST batch database reads and utilize concurrent Promise arrays (e.g. `Promise.allSettled`) for external dispatches to compress execution time.
improvement: Backend Architect Agent must explicitly mandate batching patterns (like `IN` queries) and concurrent processing for cron jobs dealing with varying user numbers. Code Review Agent must reject `await` statements wrapped inside simple loops interacting with databases or 3rd party APIs.

---

---

date: 2026-03-11
project: Project Clarity (issue-004)
issue: Gemini JSON output was wrapped in Markdown codeblocks, crashing JSON.parse() and causing task save failures.
root_cause: Code assumed AI structured outputs were raw stringified JSON, ignoring common LLM behaviors where responses are wrapped in markdown formatting.
rule: All JSON parsing from unstructured or semi-structured LLM outputs must be preceded by a sanitization/stripping step (e.g. regex replace of ```json markdown blocks).
improvement: Code Review Agent must reject naive `JSON.parse(ai_response.text)` without a preceding regex clean or try/catch fallback block.

---

---

date: 2026-03-11
project: Project Clarity (issue-004)
issue: Unbounded database queries (SELECT \* FROM tasks without LIMIT) created a risk of infinitely growing initial load payloads.
root_cause: Convenience of MVP implementation omitted basic database pagination and limits for list queries.
rule: Every GET or list query on a database MUST enforce a hard `.limit()` or pagination strategy, even if the dataset is currently small.
improvement: Backend Architect and Code Review Agents must actively check for `.limit()` or pagination clauses on any list-fetching endpoint.

---

---

date: 2026-03-11
project: Project Clarity (issue-004)
issue: Missing state persistence for marked 'done' tasks - frontend updated optimistically but reloads brought tasks back.
root_cause: MVP scope prioritized creation flow and skipped the mutation API endpoint, leading to a broken core loop.
rule: No optimistic UI mutation can be shipped without a corresponding backend persistence endpoint hooked up and tested.
improvement: Peer Review and QA Agents must explicitly verify that any state changes represented visually in the UI are persisted successfully to the database.

---

---

date: 2026-03-11
project: Project Clarity (issue-004)
issue: Telemetry events defined in the Metric Plan were absent in the codebase during Deploy Check.
root_cause: The pipeline executed `/metric-plan` _after_ all implementation and QA stages, disconnecting analytics definition from the build cycle.
rule: Telemetry instrumentation (e.g. PostHog client) must be bundled into the feature implementation phase rather than treated as a post-QA checklist item.
improvement: Execute Plan agent must mandate integration of telemetry trackers during the build. Metric Plan should ideally shift left conceptually.

---

date: 2026-03-19
project: SMB Feature Bundling Engine (issue-005)
issue: Rate limiting on unauthenticated endpoint calling Gemini was deferred until /peer-review (3 stages late)
root_cause: backend-architect-agent had no prompt instruction requiring a rate limiting strategy for unauthenticated endpoints calling paid external APIs. The Anti-Sycophancy 10x traffic check does not surface cost-abuse (bot requests ≠ load spikes).
rule: Any architecture spec that includes an unauthenticated endpoint calling a paid external API must include a rate limiting strategy. This is a blocking architecture requirement, not a post-review improvement.
improvement: backend-architect-agent Mandatory Pre-Approval Checklist now requires specifying rate limiting for all unauthenticated paid-API endpoints before outputting the spec.

---

---

date: 2026-03-19
project: SMB Feature Bundling Engine (issue-005)
issue: SessionId was derived from DB return value, causing it to equal "unknown" on DB failure — poisoning PostHog analytics and causing 400 errors on PATCH endpoint
root_cause: Architecture spec defined the sessionId field but gave no ordering constraint. Engineer naturally generated the ID after the DB insert returned.
rule: When a sessionId or correlation ID is used across analytics, API routes, and DB, the architecture spec must state: "Generate sessionId (crypto.randomUUID()) before all downstream operations so it is stable regardless of DB or service failures."
improvement: backend-architect-agent Mandatory Pre-Approval Checklist now requires explicit sessionId ordering constraint whenever a session ID spans analytics + API + DB.

---

---

date: 2026-03-19
project: SMB Feature Bundling Engine (issue-005)
issue: No Gemini timeout specified — Vercel hard-kills functions at 10s returning HTML, which the client parsed as JSON and threw as "Network error"
root_cause: backend-architect-agent mentioned "API latency" as a risk but did not mandate a concrete timeout. Vercel's 10s limit returns an HTML error page, not JSON, causing misleading client errors.
rule: All architecture specs with external AI API calls on Vercel must include: "Wrap in Promise.race with AbortController at ≤ 9s. Return JSON 504 on timeout — never let Vercel's HTML error page reach the client."
improvement: backend-architect-agent Mandatory Pre-Approval Checklist now requires specifying AbortController timeout for every API route that calls an external AI model.

---

---

date: 2026-03-19
project: SMB Feature Bundling Engine (issue-005)
issue: Clipboard copy failure was silent — empty catch block gave PM zero feedback during a live sales call
root_cause: No frontend standard required a fallback + error state for clipboard operations. Engineer implemented the happy path only.
rule: Any clipboard copy interaction must implement: (1) navigator.clipboard.writeText() primary, (2) document.execCommand('copy') fallback, (3) visible inline error state if both fail. Silent catch blocks on user-facing copy actions are never acceptable.
improvement: coding-standards.md now includes a Clipboard Operations section mandating fallback + inline error state for all copy-to-clipboard interactions.

---

date: 2026-03-21
project: Ozi Reorder Experiment (issue-006)
issue: Internal worker endpoint accepted unauthenticated POST requests — experiment data could be corrupted by any caller
root_cause: Architecture spec described the fan-out worker pattern but did not mandate an auth mechanism. "Internal" was treated as an implicit trust boundary. No checklist item required auth on worker-style routes.
rule: Any API route that writes to experiment tables (cohorts, reminders, events, cron state) must specify its auth mechanism by name in the architecture spec. "Internal" is not an auth mechanism. All POST routes must be treated as externally reachable regardless of their intended caller.
improvement: backend-architect-agent Mandatory Pre-Approval Checklist now requires specifying auth mechanism for every route that writes to experiment data tables. commands/execute-plan.md requires confirming auth header requirement before wiring any POST route.

---

date: 2026-03-21
project: Ozi Reorder Experiment (issue-006)
issue: order_placed PostHog event fired from two sources (server API + client useEffect) — North Star double-counted on every reorder
root_cause: Architecture plan defined the event but not its canonical emission point. No rule existed prohibiting dual-emission for a single PostHog event. Engineer wired both API-side and page-side tracking independently.
rule: Each PostHog event that contributes to the North Star metric must have exactly one authoritative emission point — either client OR server, never both. If the server fires the event on API confirmation, all client-side re-firings of the same event name must be removed. Document the single source in an inline comment.
improvement: commands/execute-plan.md Single Emission Source Rule added. code-review-agent.md now checks for PostHog event name appearing in both server-side routes and client-side components.

---

date: 2026-03-21
project: Ozi Reorder Experiment (issue-006)
issue: orderId in deep link was decorative — reorder page fetched last-essential by userId, showing wrong product if user had a newer order
root_cause: Architecture spec defined orderId as the URL parameter but did not specify the exact DB query. Engineer defaulted to the already-available getLastEssentialByUserId() helper, which was semantically wrong for an experiment attribution flow.
rule: When a URL parameter names a specific entity (orderId, reminderId, sessionId), the page or API handler must fetch that exact entity by that ID. Fallback-to-owner lookups (e.g., fetching by userId when orderId is in the URL) corrupt experiment attribution and are never acceptable for experiment-instrumented flows.
improvement: backend-architect-agent now requires specifying exact DB query (table, WHERE clause, column) for every URL containing an entity ID parameter. peer-review-agent now verifies URL ID → DB lookup fidelity on experiment deep links.

---

date: 2026-03-21
project: Ozi Reorder Experiment (issue-006)
issue: ControlGroupSimulator reset to idle on page refresh — control conversions could be fired multiple times, corrupting North Star comparison
root_cause: Simulator was implemented with React component state only. Full page reload reinstantiates the component as idle. The localStorage deduplication pattern used elsewhere in the same codebase was not applied to the new component.
rule: Any simulation or conversion tool that fires write-once PostHog events must be idempotent across page refreshes. React component state is insufficient. Apply localStorage keying (check on mount → disable if key exists) AND a DB uniqueness constraint (ON CONFLICT DO NOTHING) for every write-once event emitter.
improvement: peer-review-agent Step 5 now includes a demo simulation tool idempotency check. backend-architect-agent Dashboard & Reporting section now requires specifying both localStorage key and DB deduplication for any simulation tool.

---

date: 2026-03-21
project: Ozi Reorder Experiment (issue-006)
issue: PostHog Promise.all in worker threw on PostHog failure — worker returned 500, trigger undercounted remindersSent even though DB state was correct
root_cause: PostHog calls were passed to Promise.all without individual try/catch. A PostHog SDK exception propagated to the route handler. The pattern from issue-003 established concurrent processing but did not require per-call telemetry isolation.
rule: All PostHog server-side calls in worker routes must be individually wrapped in try/catch before being passed to Promise.allSettled. A PostHog failure must never cause a worker to return 500. Worker HTTP status must reflect DB write state, not telemetry write state. Pattern: Promise.allSettled([trackA(data).catch(e => console.error(e)), trackB(data).catch(e => console.error(e))]).
improvement: commands/execute-plan.md Telemetry Resilience Requirement updated to require Promise.allSettled with per-call .catch() for all PostHog worker calls. qa-agent now includes a Telemetry Unavailability test in Failure Simulation.

---

date: 2026-03-21
project: Ozi Reorder Experiment (issue-006)
issue: README.md and .env.local.example were missing at deploy-check — third consecutive cycle with this blocker (issue-004, issue-005, issue-006)
root_cause: execute-plan command listed README creation as implied but not as an explicit deliverable. Environment variables added during fix cycles were not tracked against .env.local.example. The blocker was caught twice before but no upstream instruction was hardened enough to prevent recurrence.
rule: README.md and .env.local.example are mandatory deliverables of /execute-plan, not polish for /deploy-check. Every env var introduced at any pipeline stage (including peer-review fix cycles) must be added to .env.local.example in the same commit that introduces it. A /deploy-check README failure is always an execute-plan prompt failure.
improvement: commands/execute-plan.md now has an explicit final checklist requiring README.md with 9 sections and .env.local.example listing every process.env.\* reference before execute-plan can be marked complete.

---

date: 2026-03-21
project: Ozi Reorder Experiment (issue-006)
issue: Error-path telemetry events absent for third consecutive cycle — per-user failure, cron_run_completed, and experiment_ended events not wired
root_cause: The Telemetry Completeness Requirement added after issue-005 covered success-path and AI-branch events but did not explicitly require error-path events in catch blocks or lifecycle events at guard evaluations.
rule: Telemetry completeness means happy-path AND error-path events. For every cron worker: (1) wire a per-user failure event in the catch block, (2) wire a cron_run_completed event after Promise.allSettled, (3) wire experiment lifecycle events at every guard evaluation (EXPERIMENT_END_DATE, opt-out threshold). These are blocking requirements, not production-only enhancements.
improvement: commands/execute-plan.md Telemetry Completeness Requirement expanded to explicitly require error-path and lifecycle events. qa-agent now includes a failure telemetry verification test in Failure Simulation.

---

date: 2026-03-28
project: Nykaa Hyper-Personalized Style Concierge (issue-008)
issue: Telemetry Latency in Critical Path caused API slowness and false client side aborts.
root_cause: Backend API routes (shelf, rerank) awaited PostHog telemetry flushes, injecting 200-500ms of external network latency into the hot path.
rule: Telemetry calls (e.g., PostHog `captureServerEvent`) in user-facing API routes must be fire-and-forget (`.catch(() => {})`) instead of `await`ed to prevent external latency from corrupting performance SLAs and experiment data.
improvement: backend-engineer-agent now mandates fire-and-forget pattern for telemetry in hot paths.

---

---

date: 2026-03-28
project: Nykaa Hyper-Personalized Style Concierge (issue-008)
issue: Unprotected JSON.parse on sessionStorage crashed client, and race condition in Search Payload caused network overlapping.
root_cause: Frontend implementation prioritized functional completion over defensive programming.
rule: All local storage reads must be wrapped in try/catch, and all search/filter network requests triggered by user input must utilize an AbortController.
improvement: frontend-engineer-agent now enforces try/catch on storage reads and AbortController on async fetch.

---

---

date: 2026-03-28
project: Nykaa Hyper-Personalized Style Concierge (issue-008)
issue: A/B experiment salt exposed to client via NEXT*PUBLIC* prefix, control cohort label returned in API response — enabling cohort self-selection
root*cause: Engineer defaulted to NEXT_PUBLIC* for shared config without verifying whether the value must be cryptographically hidden. API response included raw cohort string "control" without masking.
rule: Cryptographic salts for A/B experiments must be server-only env vars (no NEXT*PUBLIC* prefix). API responses to clients must never expose the true cohort label for control groups — return a neutral value like "default". Server-side PostHog events are the correct place to record the real cohort.
improvement: backend-engineer-agent now mandates server-only salts and masked cohort labels. backend-architect-agent Mandatory Pre-Approval Checklist item 8 now covers metric verifiability including experiment integrity constraints.

---

---

date: 2026-03-28
project: Nykaa Hyper-Personalized Style Concierge (issue-008)
issue: Missing North Star metric flow. "Add-to-Cart" lifting was defined as success metric, but no such UI or button was ever built.
root_cause: The architecture agents mapped API states to existing features but did not verify whether the metrics defined could actually be measured by the requested UI.
rule: No product or architecture plan can be approved unless every single success metric has a corresponding, explicitly designed user flow and telemetry trigger in the specification.
improvement: backend-architect-agent now requires explicitly verifying metric verifiability.

---
