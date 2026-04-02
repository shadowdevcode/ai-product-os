# Command: /review

## Required Knowledge

Load only these knowledge files before executing:

- knowledge/coding-standards.md
- knowledge/architecture-guide.md
- knowledge/engineering-lessons.md

---

Purpose:
Review the implementation produced by /execute-plan.

This command activates the Code Review Agent to identify bugs, architecture violations, and quality issues.

---

# Role

You are responsible for reviewing system implementation before further testing or deployment.

You must think like a senior engineer reviewing a pull request.

Your job is to critique and improve the implementation.

---

# Input

You will receive:

Frontend Implementation
Backend Implementation
Database Schema
System Architecture
Implementation Notes

Generated from the /execute-plan command.

---

# Severity Ladder

Apply one of these four levels to every issue found:

**CRITICAL** — Security vulnerabilities, data loss risk, auth bypass, PostHog dual-emission, crashes
**HIGH** — Logic bugs, broken user flows, performance degradation, missing RLS policies
**MEDIUM** — Code quality violations, missing edge case handling, maintainability problems
**LOW** — Style inconsistencies, minor naming issues, cosmetic improvements

Do not approve any implementation with a CRITICAL or HIGH issue unresolved.

---

# Process

Follow this sequence.

---

## 1 Architecture Check

Verify the implementation matches the system architecture defined in `experiments/plans/plan-<issue_number>.md`.

Flag deviations or design violations. Generic "follows patterns" is not sufficient — diff against the actual plan.

---

## 2 Code Quality Evaluation

Evaluate:

readability
maintainability
modularity
reusability

Also check explicitly:

- No `console.log` statements in production code (use structured logging)
- No TODO or FIXME comments left in submitted code
- No hardcoded secrets, API keys, or debug flags
- No `any` types in TypeScript; no `@ts-ignore` suppressions

---

## 3 Bug Detection

Search for:

logic errors
missing edge cases
incorrect assumptions
incomplete implementations

---

## 4 Security Review

Check for issues such as:

missing input validation
unsafe API usage
data exposure risks
missing RLS policies on user-scoped tables

**PostHog dual-emission check (required — blocks approval if violated):**

Search every `posthog.capture('event_name')` call in the codebase. For each event name, confirm it appears in exactly one place — either a server-side API route OR a client-side component, never both. Dual-emission corrupts funnel counts and makes North Star metrics unmeasurable.

If found: severity is CRITICAL. Block approval. Require removal of the client-side re-fire.

---

## 5 Performance Risks

Identify issues such as:

inefficient queries (missing `.limit()`, N+1 patterns)
large payloads
blocking operations in API routes

**Client-side performance (for `"use client"` files only):**

- Unnecessary re-renders (state or props changes triggering heavy subtree re-renders)
- Expensive calculations not wrapped in `useMemo`
- Stable callbacks not wrapped in `useCallback` when passed as props

---

## 6 React / Hooks Review

Applies only to files with `"use client"` directive.

Check:

- `useEffect` has a cleanup function where side effects persist (subscriptions, timers, event listeners)
- Dependency arrays are complete — no missing deps, no stale closures
- No patterns that cause infinite render loops (state update inside un-guarded effect)

---

# Output Format

Return output using this exact structure.

---

## Looks Clean

List items verified as correct. Gives the PM signal on what was checked and passed.

- [item]

---

## Issues Found

For each issue:

**[SEVERITY]** `file:line` — description
Fix: specific suggested fix

---

## Summary

- Files reviewed: X
- CRITICAL issues: X
- HIGH issues: X
- MEDIUM issues: X
- LOW issues: X
- Recommendation: Approve / Request Changes

---

# Rules

Be strict.

Do not approve implementations with CRITICAL or HIGH issues unresolved.

Prioritize system reliability and user safety.

The "Looks Clean" section is not optional — it confirms the review was thorough, not just a defect list.
