# Postmortem: Project Clarity (PM To-Do List MVP) - Issue 004

**Date:** 2026-03-11
**Project:** Clarity (PM To-Do List MVP)
**Pipeline Status:** Completed (Learning Phase)

---

## Executive Summary

Project Clarity successfully completed the full 12-step pipeline from `/create-issue` through `/learning`. The MVP demonstrated effective AI-powered task categorization for Product Managers, with all quality gates passing after remediation. Three critical issues emerged during review stages that, if unaddressed, would have resulted in data loss and broken core functionality.

---

## Issue Observed 1: Brittle AI JSON Parsing

### What Happened
The initial implementation naively called `JSON.parse()` directly on the Gemini API response text. During testing, Gemini occasionally returned valid JSON wrapped in markdown codeblocks (```json ... ```), causing `JSON.parse()` to throw exceptions and the entire task save operation to fail.

### Impact
- **User Impact**: Complete data loss - user's thought/task was discarded with no feedback
- **Frequency**: Intermittent (estimated 5-10% of AI calls based on LLM behavior patterns)
- **Discovery Stage**: Peer Review

### Root Cause
Trust in structured output format without defensive sanitization. The code assumed that because we specified `responseMimeType: "application/json"`, Gemini would always return clean JSON. This assumption ignored well-documented LLM behaviors where models wrap outputs in formatting for readability.

### Fix Applied
```typescript
// Before (naive)
const result = JSON.parse(response.text);

// After (defensive)
const cleanText = response.text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
const result = JSON.parse(cleanText);
```

### Preventative Rule
**All JSON parsing from unstructured or semi-structured LLM outputs MUST be preceded by a sanitization/stripping step.** Never trust that AI structured outputs will be raw JSON - always strip markdown artifacts and use try/catch with explicit fallback states.

### System Improvement
Code Review Agent must actively reject any `JSON.parse(ai_response.text)` pattern without preceding regex cleaning or explicit error handling with user data preservation.

---

## Issue Observed 2: Missing Backend Persistence for UI State Changes

### What Happened
The MVP implementation included an optimistic UI update that visually removed tasks when marked "done," but no corresponding backend `PUT` endpoint existed to persist this state change to the database. On page reload, all "completed" tasks reappeared as if nothing happened.

### Impact
- **User Impact**: Broken core workflow - users cannot actually complete tasks
- **Trust Damage**: Critical - destroys product credibility immediately
- **Discovery Stage**: Peer Review

### Root Cause
Scope creep avoidance taken too far. The initial MVP plan focused on the "create" flow (brain dump → AI categorization → display) and intentionally deferred the "update" flow to stay lean. However, this crossed the line from "MVP" to "broken product" because marking tasks done is a fundamental part of a to-do list.

### Fix Applied
Added `PUT /api/tasks?id=[uuid]` endpoint:
```typescript
export async function PUT(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const { status } = await req.json();

    const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

    return NextResponse.json({ success: true, task: data });
}
```

### Preventative Rule
**No optimistic UI mutation can be shipped without a corresponding backend persistence endpoint hooked up and tested.** If a state change is visible in the UI, it MUST be durable in the database.

### System Improvement
- Peer Review Agent must explicitly verify that any state changes represented visually in the UI are persisted successfully to the database
- QA Agent must test reload behavior after every state-changing action (add, update, delete)

---

## Issue Observed 3: Unbounded Database Queries

### What Happened
The `GET /api/tasks` endpoint initially fetched ALL tasks from the database without any `LIMIT` clause. While harmless at MVP scale (tens of tasks), this creates a time bomb where performance degrades linearly as the dataset grows.

### Impact
- **User Impact**: Increasingly slow page loads as task count grows
- **System Impact**: Potential serverless timeout (>10s for thousands of tasks)
- **Discovery Stage**: Code Review

### Root Cause
Convenience trumping defensive programming. The MVP logic defaulted to "fetch everything" because limiting and pagination adds complexity, and the initial dataset size masked the issue.

### Fix Applied
```typescript
// Before
const { data } = await supabase.from('tasks').select('*');

// After
const { data } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
```

### Preventative Rule
**Every GET or list query on a database MUST enforce a hard `.limit()` or pagination strategy, even if the dataset is currently small.** Database queries without limits are technical debt that will cause production incidents.

### System Improvement
Backend Architect Agent and Code Review Agent must actively check for `.limit()` or pagination clauses on any list-fetching endpoint.

---

## Issue Observed 4: Telemetry Added Post-QA (Non-Blocking)

### What Happened
Analytics instrumentation (PostHog integration) was not included in the original `/execute-plan` implementation. It was added during the `/deploy-check` phase after discovering the gap, requiring an additional build cycle.

### Impact
- **User Impact**: None (telemetry is invisible to users)
- **Process Impact**: Delayed deployment, added friction to pipeline
- **Discovery Stage**: Deploy Check

### Root Cause
The 12-step workflow positions `/metric-plan` at stage 9, after implementation, review, and QA are complete. This implicitly signals that telemetry is a "nice-to-have" rather than part of the definition of done.

### Fix Applied
During Deploy Check, added:
- `posthog-js` (frontend events)
- `posthog-node` (backend events)
- Key events: `task_submitted`, `task_categorized`, `task_completed`, `ai_fallback_triggered`

### Preventative Rule
**Telemetry instrumentation (e.g., PostHog client) must be bundled into the feature implementation phase rather than treated as a post-QA checklist item.**

### System Improvement
Execute Plan Agent should mandate integration of telemetry trackers during the build phase. Consider shifting `/metric-plan` conceptually leftward in the workflow (execute metric planning earlier, even if formal validation happens later).

---

## What Went Well

1. **Strong Quality Gates**: Peer Review and Code Review caught all critical issues before deployment
2. **Defensive Fallback Design**: AI failure handling prevented data loss (fallback to `ops` category with manual review tag)
3. **Clear Separation of Concerns**: API route, component logic, and database operations cleanly separated
4. **Rapid Remediation**: All fixes applied within a single iteration, no multi-round ping-pong

---

## Metrics (Post-Deploy)

*Note: Since this is an MVP portfolio project without real users, metrics are simulated validation of instrumentation:*

- **Build Success**: Next.js production build completed without errors
- **Telemetry Validation**: All 4 critical events fire correctly in PostHog test environment
- **QA Pass Rate**: 100% after peer review fixes applied
- **Time to Deployment**: ~6 hours from `/execute-plan` to deployment-ready

---

## Knowledge Updates

The following lessons were extracted and written to the knowledge base:

### Engineering Lessons
1. Strip/sanitize markdown codeblocks from AI responses before JSON parsing
2. Enforce `.limit()` clauses on every database list query
3. Never ship optimistic UI changes without implemented backend persistence
4. Telemetry SDKs must be implemented alongside feature development, not post-QA

### Product Lessons
1. User input must never be lost due to third-party service failures - implement strict fallback states
2. Graceful degradation (e.g., "Uncategorized" + save raw text) prioritizes zero data loss over AI accuracy

### Prompt Library Updates
1. Added AI parsing safety pattern to Code Generation Prompts
2. Enhanced Peer Review checklist to explicitly verify state persistence endpoints

---

## Recommendations for Future Cycles

1. **Shift Telemetry Left**: Define events during `/create-plan`, implement during `/execute-plan`
2. **Expand QA Edge Cases**: Add explicit tests for "mark done → reload → verify gone" flows
3. **Consider Integration Tests**: Manual QA worked well, but automated E2E tests would catch persistence gaps earlier

---

## Conclusion

Project Clarity validated the AI Product OS's ability to catch critical issues through multi-stage review processes. The issues discovered were exactly the kind that would have caused silent failures or user frustration in production. The learning extracted from this cycle strengthens the knowledge base for future projects.

**Pipeline Status: ✅ Complete**
