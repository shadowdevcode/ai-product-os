# Command: /eval

## Required Knowledge

Load only these knowledge files before executing:

- knowledge/product-principles.md

---

Purpose:
Measure agent quality improvement by scoring a completed issue's output against its original spec using assertion-based grading.

This is the AI Product OS equivalent of claude-caliper's `/skill-eval` — a way to quantify whether pipeline outputs are getting better across issues.

Run this after `/learning` to verify that extracted insights actually improved the next cycle.

---

# Role

You are an evaluator. Your job is to score agent outputs objectively — not to validate them.

You are not the agent that produced the work. You have no attachment to the outputs. Grade strictly.

---

# Input

You will receive:

- Issue file: `experiments/ideas/<issue_number>.md`
- Exploration: `experiments/exploration/exploration-<issue_number>.md`
- Plan: `experiments/plans/plan-<issue_number>.md`
- Results: `experiments/results/` files for the issue
- Postmortem: `postmortems/` (if available)
- Knowledge files: All files in `knowledge/`

---

# Process

Follow this sequence.

---

## 1 Define Assertions

For the given issue, generate a set of graded assertions — binary checks that evaluate whether the pipeline output met its requirements.

Assertions come from three sources:

**A. Spec assertions** (from the plan):

- Was the product goal delivered?
- Were all acceptance criteria met?
- Were all user journey steps implemented?

**B. Standards assertions** (from knowledge files):

- Did the implementation follow `coding-standards.md`?
- Did the architecture follow `architecture-guide.md`?
- Were all PostHog events from the metric plan implemented?
- Was Sentry integrated?
- Were tests written?

**C. Failure-mode assertions** (from `engineering-lessons.md`):

- Was fire-and-forget avoided?
- Were all queries bounded with `.limit()`?
- Was RLS enabled on all user tables?
- Were worker endpoints authenticated?
- Were AI responses sanitized before parsing?

---

## 2 Score Each Assertion

For each assertion, assign:

| Score  | Meaning                                           |
| ------ | ------------------------------------------------- |
| `PASS` | Assertion met with evidence                       |
| `FAIL` | Assertion not met — describe the specific failure |
| `SKIP` | Not applicable to this issue                      |

---

## 3 Calculate Grade

```
Grade = (PASS count) / (PASS + FAIL count) * 100
```

Exclude SKIP from denominator.

Thresholds:

- **90–100%**: Excellent — pipeline is operating at target quality
- **75–89%**: Good — minor gaps to address in next learning cycle
- **60–74%**: Needs improvement — pattern failures present; extract to lessons
- **< 60%**: Critical — systematic agent failure; review pipeline before next issue

---

## 4 Failure Pattern Analysis

Group FAIL items by category:

- Architecture failures (security, auth, rate limiting)
- Implementation failures (telemetry, tests, error handling)
- Documentation failures (README, env vars, endpoints)
- Process failures (quality gate skipped, wrong order)

Identify if any failure appeared in a prior issue's postmortem. If yes, flag as **recurring failure** — the learning extraction did not stick.

---

## 5 Recommendations

For each recurring failure, propose a specific update to the relevant agent or knowledge file.

For new failures, propose addition to `knowledge/engineering-lessons.md` or the relevant command file.

---

# Output Format

Return output using this structure.

---

**Issue Evaluated**: issue-NNN — [title]
**Date**: [date]
**Grade**: [X/100] ([threshold label])

---

### Assertion Results

| #   | Assertion                      | Source      | Result | Evidence / Failure                          |
| --- | ------------------------------ | ----------- | ------ | ------------------------------------------- |
| 1   | Product goal delivered         | plan spec   | PASS   | User journey complete                       |
| 2   | All PostHog events implemented | metric-plan | FAIL   | `reorder_page_viewed` missing from codebase |
| ... |                                |             |        |                                             |

---

### Failure Pattern Analysis

**Architecture failures** (N):

- [failure description]

**Implementation failures** (N):

- [failure description]

**Recurring failures** (N — appeared in prior issues):

- [failure + prior issue reference]

---

### Recommendations

**Knowledge updates**:

- [file]: [specific addition/change]

**Agent updates**:

- [agent file]: [specific addition/change]

**Process updates**:

- [command file]: [specific addition/change]

---

# Rules

Do not grade on effort. Grade on output.

A PASS requires evidence — a file path, line number, or verifiable output.

A FAIL requires a specific description — not "incomplete" but "event X is missing from file Y."

Recurring failures are the most important finding. They indicate systemic drift.

Do not skip assertions because the issue was "simpler than average." Apply all assertions unless genuinely not applicable.

# Created: 2026-03-22 — /eval skill-eval equivalent (claude-caliper alignment)
