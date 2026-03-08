# Postmortem: AI Personal Finance Advisor (Issue 003)

## Issue Observed 1
**Serverless Function Terminations**: In the initial execute-plan phase, WhatsApp replies were dispatched using "fire and forget" promises without `await`. In local testing environments this works fine, but upon simulated deployment in Vercel, the background execution is suspended immediately once the HTTP 200 is returned, leading to reliably dropped outbound messages.

### Root Cause
Misunderstanding of the Vercel/Next.js serverless execution context where background async tasks are halted when the main thread resolves.

### Preventative Rule
Every async API call (especially external network boundaries like Meta/Twilio) executed inside a Next.js API route or cron job MUST be explicitly `await`ed or resolved before returning the HTTP response.

### System Improvements
Update architecture guidelines to explicitly mention "No fire-and-forget Promises in Serverless routes." Add a specific Code Review Agent check to detect unawaited `fetch` or SDK calls in API routes.

---

## Issue Observed 2
**N+1 Query Architectures in Crons**: The Weekly Summary cron iterated through users, firing sequential database queries and sequential API calls for each user.

### Root Cause
Defaulting to single-user CRUD operations inside loops instead of designing for bulk/batch processing early on.

### Preventative Rule
Cron jobs fetching data for multiple entities MUST use batching (e.g., Supabase `.in('user_id', userIds)`) and concurrent Promise resolution (`Promise.allSettled`) rather than looping explicit `await`s.

### System Improvements
Add a "Cron Architecture Standard" to the Coding Standards doc mandating batch-fetching patterns.

---

## Issue Observed 3
**UX Failure on Zero-Spend and Non-Text Inputs**: The initial webhook implementation expected a number, causing zero ("0") to be evaluated as falsy (invoking an error state), and failing to catch non-text messages (like receipts).

### Root Cause
Narrow "Happy Path" testing during `execute-plan`. The development focused only on the standard "spent > 0" scenario and assumed text formats.

### Preventative Rule
Every webhook handling unstructured user input (like WhatsApp) must explicitly handle:
1. Valid edge cases (like explicitly testing `0` vs `null`).
2. Invalid object types (handling media/audio cleanly).

### System Improvements
Require the Peer Review Agent to generate an explicitly "Adversarial Edge Case List" testing all non-standard input formats for user-facing inputs.

## Knowledge Updates
- **engineering-lessons.md**: Add Serverless Promise rule and Cron N+1 Batching rule.
- **product-lessons.md**: Add Unstructured Input (Zero and Media) fallback rule.
- **prompt-library.md**: Enhance Peer Review Prompt to aggressively hunt UX edge cases.
