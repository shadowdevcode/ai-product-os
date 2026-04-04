# Postmortem — MoneyMirror (issue-009)

**Date:** 2026-04-02
**Agent:** Learning Agent
**Pipeline cycle:** issue-009 — full 12 stages complete
**Status:** APPROVED at deploy-check — PR #14 open

---

## Full Pipeline Issues Identified

### Issue PM-1 — Dashboard transient state: persisted rehydration path absent from execute-plan output

**Issue Observed:**
`/dashboard` was implemented as pure client memory — results were only visible immediately after a successful parse in the same browser tab. A page refresh, a direct URL load, or a click-through from the weekly recap email all returned users to a blank upload screen.

**Root Cause:**
The plan explicitly specified `GET /api/dashboard` as a rehydration endpoint. The execute-plan output did not implement this route. The architecture specification described the dashboard only in terms of what the parse response must return — it did not specify the separate read path required on first load for non-upload entry points (refresh, deep link, email CTA). The backend engineer defaulted to wiring the parse response directly to the component state, which satisfied the spec's "what does the dashboard show" requirement without satisfying the "how does it load" requirement.

**Preventative Rule:**
Every page that is linked from an email, push notification, or external URL must have its full load path specified in the architecture: which API route is called, what query it runs, and what state it returns. Implementing only the post-mutation result path is never sufficient.

**System Improvements:**

- `backend-architect-agent.md` Mandatory Pre-Approval Checklist: Add item requiring that every results/dashboard/report page specify the exact authenticated read path for first-load rehydration. Client-memory-only post-mutation flows must be explicitly blocked.
- `commands/execute-plan.md`: Add a final verification checkpoint — for every page in the plan, confirm both the write path (mutation → result) and the read path (direct load → same result) are implemented.

**Knowledge Updates:** engineering-lessons.md, prompt-library.md

---

### Issue PM-2 — Partial write accepted as success: transaction insert failure did not block `processed` state

**Issue Observed:**
`statement/parse/route.ts` wrote the parent `statements` row, then inserted `transactions` in a separate operation. If transactions failed, the route logged a console error, kept the statement as `processed`, emitted `statement_parse_success`, and returned a 200 with the parsed data. Downstream reads (dashboard rehydration, weekly recap, advisories) all operated on a corrupted statement.

**Root Cause:**
The architecture spec defined the parse flow as a sequence of DB writes, but did not specify an atomicity strategy for the parent/child pair. The backend engineer treated transaction insert failure as a non-critical path (logged, continued) because there was no explicit instruction that the child write must succeed before the parent can enter a success state. This is the second consecutive cycle (after issue-006 `reorder_events` partial write) where a parent/child write sequence lacked an explicit atomicity requirement in the spec.

**Preventative Rule:**
Any architecture spec that includes a parent record + child records written in the same user action must explicitly declare atomicity: if the child write fails, the parent must be rolled back or marked failed. Partial success is never acceptable as a terminal state for a user-facing financial data pipeline.

**System Improvements:**

- `backend-architect-agent.md` Mandatory Pre-Approval Checklist: Add item requiring an explicit atomicity strategy for every workflow that writes parent + child rows in a single user action. Must specify: child failure → parent rollback or failure state + error telemetry.
- `agents/code-review-agent.md`: Add check for parent/child write sequences — if parent status is set to `processed`/`success` before child writes complete, flag CRITICAL.

**Knowledge Updates:** engineering-lessons.md

---

### Issue PM-3 — Worker email failure counted as success in master cron telemetry

**Issue Observed:**
The weekly-recap worker returned HTTP 200 with `{ ok: false }` when Resend email sending failed. The master cron counted any 2xx response as success. `weekly_recap_completed` reported inflated `succeeded` counts with `failed: 0` while users received no email.

**Root Cause:**
The fan-out worker HTTP contract was defined at the invocation level (master calls worker) but the success/failure propagation contract was not specified. The backend engineer returned 200 with a JSON error payload — a common REST convention — without verifying that the master's counting logic would interpret that correctly. The code-review agent caught this (MEDIUM), but the architecture spec should have prevented it.

**Preventative Rule:**
Fan-out worker HTTP contracts must be explicitly specified in the architecture: the worker must return a non-2xx status on any failure that should be counted as failed by the master. JSON error bodies alone are insufficient — the master must not need to inspect payloads to distinguish success from failure.

**System Improvements:**

- `backend-architect-agent.md`: Fan-out architecture section must state: "Worker returns non-2xx on failure. Master uses HTTP status only for success/failure accounting. Never rely on JSON body inspection for fan-out counting."

**Knowledge Updates:** engineering-lessons.md

---

### Issue PM-4 — Advisory feed fetch missing auth header: coaching never rendered in core flow

**Issue Observed:**
`dashboard/page.tsx` called `GET /api/dashboard/advisories` without an `Authorization` header. The route correctly required a JWT, returned 401, and the advisory feed silently showed empty. The "Truth Bombs" coaching section — a core MVP output — never appeared for any user.

**Root Cause:**
The advisory route was given proper auth during a code-review fix cycle. The dashboard component was written before that fix, using a bare `fetch()`. The two halves were never cross-verified. A route auth fix without updating all callers is an incomplete fix by definition.

**Preventative Rule:**
After adding or enforcing auth on any API route, all client-side callers of that route must be updated in the same change. A route auth fix without updating all callers is an incomplete fix.

**System Improvements:**

- `agents/code-review-agent.md`: Add check — for every authenticated route, verify that all `fetch()` calls to that route in client components include the required auth header. A mismatch is CRITICAL.
- `commands/execute-plan.md`: Add verification step — after wiring any authenticated route, check that all client-side callers send auth headers.

**Knowledge Updates:** engineering-lessons.md, prompt-library.md

---

### Issue PM-5 — PostHog env var mismatch: server-side telemetry dead in production

**Issue Observed:**
`.env.local.example` declared `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`, but `posthog.ts` read `process.env.POSTHOG_KEY` and `process.env.POSTHOG_HOST`. Any developer following the template would configure the wrong vars. Server-side telemetry would be silently dead in any production deployment, and the `NEXT_PUBLIC_` prefix would also have leaked the PostHog key to the browser bundle.

**Root Cause:**
The `.env.local.example` file was written from memory during execute-plan and never mechanically verified against actual `process.env.*` calls in the code. The var names diverged silently. The QA agent caught this, but a grep-based check during execute-plan could have prevented it.

**Preventative Rule:**
`.env.local.example` must be generated from the actual `process.env.*` calls in the code — not from memory. Every key must exactly match the string used in the source. A mismatch between the example file and the actual code reference is a deploy blocker.

**System Improvements:**

- `commands/execute-plan.md`: Add a mandatory final step: grep all `process.env.*` references in `src/`, extract variable names, and verify every name appears in `.env.local.example`. Any discrepancy is a blocking gap before execute-plan can be marked done.
- `agents/qa-agent.md`: Promote env var key name cross-check to a standalone QA dimension with explicit grep-based verification.

**Knowledge Updates:** engineering-lessons.md

---

### Issue PM-6 — File size violations at deploy-check: 300-line limit not enforced during generation

**Issue Observed:**
`parse/route.ts` (345 lines) and `dashboard/page.tsx` (562 lines) exceeded the 300-line limit enforced by the pre-commit hook. Both required extraction work at deploy-check — three full stages after implementation. Extraction added `persist-statement.ts`, `UploadPanel.tsx`, `ParsingPanel.tsx`, and `ResultsPanel.tsx` at the last stage.

**Root Cause:**
The 300-line file limit is enforced mechanically at commit time but is not an active constraint during code generation. Large files are written without budgeting for size. Extraction is deferred until a hook rejects the commit.

**Preventative Rule:**
The 300-line file limit must be applied during code generation, not at commit time. Any route or page expected to contain multi-phase logic must be designed with extraction points upfront. Files projected to exceed 250 lines must be split before writing.

**System Improvements:**

- `commands/execute-plan.md`: Add to implementation checklist: for any API route handling more than 2 logical phases, the route handler must delegate to helpers at generation time. Target: route files under 200 lines, page files under 250 lines.
- `agents/backend-engineer-agent.md` + `agents/frontend-engineer-agent.md`: Add hard constraint: if a file is projected to exceed 250 lines during generation, extract into a helper or sub-component before writing past that limit.

**Knowledge Updates:** engineering-lessons.md

---

### Issue PM-7 — `pdf-parse` wrong result property accessed: `result.pages?.length` instead of `result.total`

**Issue Observed:**
`pdf-parser.ts` called `result.pages?.length` to derive `pageCount`. The `pdf-parse` v2 library exposes `result.total`, not `result.pages.length`. `pageCount` resolved to `1` for all documents — silent incorrect behavior caught at code-review (CRITICAL).

**Root Cause:**
The execute-plan agent generated code against its training knowledge of the `pdf-parse` API without verifying the actual installed package version's exported interface. The library API changed between versions. No verification step required checking the installed package's exports against the generated call pattern.

**Preventative Rule:**
When generating code against a third-party package whose API has changed between major versions, verify the installed version's exported types or index against the generated call pattern. Training knowledge of library APIs is not sufficient for version-sensitive properties.

**System Improvements:**

- `commands/execute-plan.md`: Add step — after wiring any third-party library for the first time, check the installed version in `package.json` and verify the exported API matches the generated usage pattern.

**Knowledge Updates:** engineering-lessons.md

---

## Prompt Autopsy

### Agent: `backend-architect-agent`

**Missed 1:** Did not specify the persisted first-load read path for `/dashboard`.
**Root cause in prompt:** Mandatory Pre-Approval Checklist has no item requiring that every result/dashboard page specify the separate read path for refresh and deep link scenarios.
**Proposed fix:** Add to Mandatory Pre-Approval Checklist: "For every dashboard, report, or results page linked from navigation, email, or external URL: specify the exact authenticated read path for first-load rehydration. The mutation response path (result available immediately after POST) is not sufficient — the page must hydrate from the DB on any entry point. Client-memory-only result flows are blocked."

**Missed 2:** Did not specify atomicity for parent (statements) + child (transactions) write sequence.
**Root cause in prompt:** No checklist item for multi-table write atomicity.
**Proposed fix:** Add to Mandatory Pre-Approval Checklist: "For every user action that writes a parent record + one or more child records: specify the atomicity strategy. If child write fails, define whether parent is rolled back or transitioned to a failed state. Partial success (parent = processed, children = missing) is never an acceptable terminal state."

**Missed 3:** Did not specify worker HTTP contract for fan-out failure propagation.
**Root cause in prompt:** Fan-out pattern describes master → worker invocation but not the required HTTP status contract on failure.
**Proposed fix:** Add to fan-out architecture template: "Worker must return HTTP non-2xx (e.g., 502) on any failure that the master should count as failed. Master uses HTTP status only — never inspects JSON body — for success/failure accounting."

---

### Agent: `backend-engineer-agent`

**Missed 1:** Generated `dashboard/page.tsx` calling an authenticated route without an auth header.
**Root cause in prompt:** No instruction to cross-verify all fetch call sites when auth is added to a route.
**Proposed fix:** Add: "After adding authentication to any API route, search all client-side callers of that route path and verify each sends the required auth header. A fetch to an authenticated route without an Authorization header is a CRITICAL bug."

**Missed 2:** Generated files exceeding the 300-line limit.
**Root cause in prompt:** File size limit stated as standard but not enforced during generation.
**Proposed fix:** Add: "Before writing any API route or page component expected to contain multi-phase logic, identify extraction points upfront. Route handlers must stay under 200 lines; page components must stay under 250 lines. If a file would exceed these limits, extract helpers or sub-components before writing past the limit — never write a large file and refactor later."

---

### Agent: `code-review-agent`

**Missed:** Confirmed auth on advisory route but did not verify all client-side callers updated to send auth headers.
**Root cause in prompt:** Review scope is per-file; no cross-file caller verification for route auth requirements.
**Proposed fix:** Add to review checklist: "For every API route confirmed to require auth: search all `fetch()`, `axios`, and `useSWR` calls in client components targeting that route path. If any caller omits the Authorization header, flag as CRITICAL."

---

### Agent: execute-plan (command)

**Missed 1:** `.env.local.example` written from memory, not verified against source code.
**Root cause in prompt:** Final checklist requires listing all env vars but not mechanical verification against grep output.
**Proposed fix:** Add to final execute-plan checklist: "Run: grep -r 'process\\.env\\.' src/ | grep -oP 'process\\.env\\.\\K[A-Z_]+' | sort -u. Compare output against every key in .env.local.example. Any key in the grep output absent from .env.local.example is a blocking gap."

**Missed 2:** No instruction to verify third-party package API surface against generated call patterns.
**Root cause in prompt:** No version-aware verification step for library usage.
**Proposed fix:** Add: "For any npm package being integrated for the first time, check the installed version in package.json and verify the generated call pattern against the package's TypeScript types or index exports before marking the integration complete."

---

## Summary Table

| #    | Issue                                     | Stage First Visible | Stage Caught                          | Severity |
| ---- | ----------------------------------------- | ------------------- | ------------------------------------- | -------- |
| PM-1 | Dashboard transient — no rehydration path | execute-plan        | peer-review R1 (A1)                   | CRITICAL |
| PM-2 | Partial write accepted as success         | execute-plan        | peer-review R1 (R1)                   | CRITICAL |
| PM-3 | Worker failure counted as success         | execute-plan        | review (MEDIUM) + peer-review R1 (R2) | HIGH     |
| PM-4 | Advisory fetch missing auth header        | post-review fix     | peer-review R1 (P1)                   | HIGH     |
| PM-5 | PostHog env var name mismatch             | execute-plan        | qa-test (QA1 BLOCKING)                | HIGH     |
| PM-6 | File size violations at deploy-check      | execute-plan        | deploy-check (pre-commit hook)        | MEDIUM   |
| PM-7 | pdf-parse wrong result property           | execute-plan        | code-review (CRITICAL)                | HIGH     |

**Root cause pattern:** 6 of 7 issues trace to execute-plan output gaps. Under-specified architecture (PM-1, PM-2, PM-3), incomplete cross-verification at implementation time (PM-4, PM-5), no file-size budget during generation (PM-6), and training-knowledge-only library usage (PM-7). The review layer caught all issues but they should have been prevented upstream.

**Recurring failure:** Parent/child write atomicity (PM-2) is the second consecutive cycle with this gap (issue-006 had a similar partial-write). Systemic — requires a hard checklist item in backend-architect-agent, not a one-time fix.

**Agents requiring prompt updates:**

1. `backend-architect-agent.md` — 3 Mandatory Pre-Approval Checklist additions
2. `backend-engineer-agent.md` — 2 hard implementation rules
3. `code-review-agent.md` — 1 caller-verification check
4. `commands/execute-plan.md` — 3 additions (env var grep, library verification, read path checkpoint)
5. `agents/qa-agent.md` — 1 env var key-name dimension addition
