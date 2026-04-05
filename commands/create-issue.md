# Command: /create-issue

## Required Knowledge

Load only these knowledge files before executing:

- knowledge/product-principles.md
- knowledge/product-lessons.md

---

Purpose:
Capture a raw product idea and convert it into a structured issue that can enter the product development pipeline.

---

# Role

You are responsible for converting messy ideas into structured problem statements.

You must think like a product manager discovering opportunities.

---

# Input

You will receive a raw idea.

Examples:

"AI PM portfolio generator"

"Tool that summarizes Gmail and sends WhatsApp notifications"

---

# Process

Follow this structure.

---

## 0 Pre-Flight Questions

Before generating the issue, assess whether the raw idea is thin (missing user, behavior, or outcome).

**If thin**: Ask 2–3 targeted questions in a single message. Wait for answers before proceeding.

Questions to ask when needed:

- What's the current behavior / pain point?
- What does the desired outcome look like?
- Who is the primary user?

**If fully formed**: Skip questions and generate directly.

Keep questions brief — one message, max 3 questions, no back-and-forth.

**Issue Type (always required):** Infer from the raw idea if obvious; otherwise include as one of the clarifying questions.

- **Feature** — new capability that didn't exist before
- **Enhancement** — improvement to an existing capability
- **Bug Fix** — something broken that needs fixing

Store the result as `issue_type` in the issue file header.

---

## 1 Problem Statement

Describe the problem clearly.

**Current State**: What is happening today / what pain exists.

**Desired Outcome**: What should be true after this is solved.

---

## 2 Target User

Identify the primary user.

---

## 3 Why This Problem Matters

Explain why solving this problem creates value.

---

## 4 Opportunity

Describe the opportunity if the problem is solved.

---

## 5 Initial Hypothesis

Define a simple hypothesis.

Example:

"If we build X for Y users, it will solve Z problem."

---

## 6 Risks / Open Questions

Call out anything that could block this or make it hard to build.

- Dependencies on external systems, APIs, or other issues
- Regulatory, technical, or product unknowns
- Questions that `/explore` should resolve

Omit this section if nothing notable applies.

---

# Output Format

Return the result in this structure.

---

Issue Title
Type: Feature | Enhancement | Bug Fix

Problem (Current State → Desired Outcome)

User

Why it Matters

Opportunity

Hypothesis

Risks / Open Questions (omit if none)

---

# Post-Output Steps

After writing `experiments/ideas/issue-<NNN>.md` and updating `project-state.md`:

## Auto-Write CHANGELOG Entry

Append to the top of `CHANGELOG.md` immediately after writing the issue file:

```
## YYYY-MM-DD — Issue Created: issue-NNN
- **Type**: Feature | Enhancement | Bug Fix
- **Title**: <issue title>
- **App**: <project/app name if known, else TBD>
- **Status**: Discovery
```

Use today's date. Do not modify any other CHANGELOG content.

---

## Auto-Bind Linear

Immediately run `/linear-bind` for the new issue.

This ensures `linear_enabled: true` is set from the moment every issue is created — no manual bind step required.

Expected outcome:

- `experiments/linear-sync/issue-<NNN>.json` created with team, project, and root issue ids
- `project-state.md` updated with `linear_enabled: true` and all linear binding fields
- Linear root issue created in `Backlog` with label `AI Product OS/Discovery`

If Linear is unavailable, log the failure explicitly and continue — do not block the pipeline.

---

# Next Step

Send this issue to the Research Agent for validation via `/explore`.
