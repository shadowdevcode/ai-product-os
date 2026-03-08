# Postmortem: InboxPulse MVP

**Date:** 2026-03-07
**Project:** InboxPulse (issue-002)

---

## 1. Issue Observed: Infinite Pagination & Context Exhaustion

**What Happened:** 
During QA testing, the Gmail fetching logic attempted to endlessly loop through years of unread emails, leading to Vercel API 504 Timeouts. Furthermore, AI summaries were of poor quality because they were relying solely on the 200-character Gmail "snippet" rather than the full email body.

**Root Cause:**
*   **Missing Bounding Constraints:** The initial architecture plan did not explicitly specify a lookback window (e.g., `newer_than:30d`) or a maximum pagination limit for the Gmail API.
*   **API Misunderstanding:** The assumption was that the core "snippet" returned by the default `users.messages.list` endpoint would contain enough context for a generative AI model, which was factually incorrect for long, complex emails.

**Preventative Rule:**
*   Data fetching loops must *always* implement hard pagination limits and temporal bounds (e.g., maximum 5 pages, within the last 30 days).
*   Generative AI integrations for text summarization must explicitly fetch full `text/plain` or `text/html` payloads, not rely on metadata snippets.

**System Improvements:**
*   Add a standard rule to the Coding Standards guide requiring hard limits on all `while` and `do...while` network loops.

---

## 2. Issue Observed: Missing System Telemetry & Database Infrastructure

**What Happened:**
The `/deploy-check` quality gate failed drastically because the remote Supabase PostgreSQL instance contained no tables, and the application lacked both client-side and server-side PostHog telemetry integrations defined in the Metric Plan.

**Root Cause:**
*   **Execution Gap:** The architecture plan assumed the database schema (`schema.sql`) would automatically sync, but Supabase requires explicit CLI linking or manual execution. 
*   **Workflow Sequencing Error:** The codebase was marked as "feature complete" and pushed to QA *before* the `/metric-plan` was executed and implemented. The telemetry code was entirely absent during the core feature development phase.

**Preventative Rule:**
*   Always execute database setup scripts against the production or staging remote URI before executing build checks. 
*   The `/metric-plan` step must be executed *alongside* or *immediately after* the architecture design phase, not as a final step right before deployment. 

**System Improvements:**
*   Update the overarching workflow to require `npx supabase db push` or raw `psql` connection testing early in the backend setup phase.
*   Shift the `/metric-plan` execution to occur immediately after the `/plan` phase, ensuring developers implement `posthog` tracking *during* the initial coding phase rather than as a band-aid at the end.

---

## 3. Issue Observed: Fragile Error Handling and Monolithic Cron Scaling

**What Happened:**
Peer reviews identified that transient Twilio sandbox errors resulted in permanent user account pauses (`is_active = false`). Furthermore, the master cron job processed users synchronously via `Promise.allSettled()`, tightly coupling the system's execution time to Vercel's 5-minute timeout.

**Root Cause:**
*   **Lack of Error Granularity:** The implementation treated all third-party API rejections (Twilio 400s vs 500s) equally as a massive failure requiring user suspension.
*   **Premature Optimization:** Attempting to process all users within one function instead of immediately dispatching them to an asynchronous queue (like QStash) or fan-out trigger mechanism.

**Preventative Rule:**
*   Error handling for third-party messaging services must distinguish between permanent errors (invalid phone numbers) and transient errors (rate limits or sandbox restrictions).
*   Any scheduled worker processing $N$ users must utilize a fan-out architecture (e.g., one HTTP trigger spawning $N$ independent serverless invocations) rather than batch processing in a single thread.

**System Improvements:**
*   Enforce a "Decoupled Execution" architectural standard where master crons only act as triggers, never as heavy calculators.

---

## Knowledge Updates

The following overarching principles should be updated based on these learnings:
1.  **Architecture Guide:** Require fan-out queueing models for any cron jobs handling external API aggregations.
2.  **Coding Standards:** Mandate temporal bounds (`newer_than`) and hard pagination limits on all external API syncs.
3.  **Agent Instructions Workflow:** Re-order the development pipeline to position the `/metric-plan` *before* the final core execution phase so telemetry is built-in rather than bolted on.
