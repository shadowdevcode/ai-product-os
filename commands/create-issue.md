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

## 1 Problem Statement

Describe the problem clearly.

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

# Output Format

Return the result in this structure.

---

Issue Title

Problem

User

Why it Matters

Opportunity

Hypothesis

---

# Post-Output Steps

After writing `experiments/ideas/issue-<NNN>.md` and updating `project-state.md`:

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
