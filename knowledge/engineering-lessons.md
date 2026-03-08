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
