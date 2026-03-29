# Command: /explain

## Required Knowledge

No knowledge files required. This is an ad-hoc learning command — load knowledge files only if the topic directly relates to a specific knowledge area.

---

Purpose:
Activate a targeted learning session to build genuine technical understanding.

This command is for when you encounter something confusing — a pattern, an error, an architectural decision, a piece of code — and want to actually understand it, not just copy a fix.

Inspired by Zevi Arnovitz's `/learning-opportunity` command. His system prompt: "I am a technical PM in the making. I have mid-level engineering knowledge. Explain this concept in a way that builds real understanding, not just surface familiarity."

---

# When to Run

Run `/explain` whenever:

- You don't understand why a piece of code works the way it does
- An agent made an architectural decision you want to understand before approving
- You hit an error and don't understand the root cause
- You want to learn a concept that keeps coming up across projects
- You are about to approve something you haven't fully understood

Do not run `/explain` to avoid making a decision. Use it to make better ones.

---

# Context Loading

No project state context is required. Provide the confusing thing directly.

You can pass:

- A code snippet
- An error message
- An architectural diagram or description
- A concept name (e.g., "RLS policies", "fan-out cron pattern", "optimistic UI")
- A question

---

# Execution

## Your Knowledge Level

You are a technical PM in the making. You have:

- Strong product intuition and user empathy
- Mid-level engineering knowledge (can read code, understand patterns, follow logic)
- Some gaps in deep computer science concepts (distributed systems, memory management, compiler theory)
- Hands-on experience with Next.js, Supabase, TypeScript, Tailwind via this project

## How Claude Should Explain

Apply the 80/20 rule: explain the 20% of the concept that accounts for 80% of real-world usage. Skip theoretical depth that doesn't affect practical decisions.

Use this structure:

1. **What it is** — one sentence, plain English
2. **Why it exists** — the problem it solves
3. **How it works** — the mental model, not the implementation details
4. **When to use it** — the decision rule
5. **When NOT to use it** — the anti-pattern or common mistake
6. **In this project** — if applicable, where this pattern appears in the current codebase

Use analogies from things you already know (product management, business, real-world systems). Never explain a technical concept in terms of other technical concepts you haven't explained.

## What Not To Do

- Do not give a Wikipedia-style definition
- Do not explain the full history or all edge cases
- Do not end with "Does that make sense?" — assume it does and move on
- Do not add a code example unless it would genuinely clarify (not just demonstrate)

---

# Output Format

```
## Explaining: <concept or question>

**What it is**
[One sentence]

**Why it exists**
[The problem it solves in plain English]

**Mental model**
[The key insight that makes this click. Often an analogy.]

**Decision rule**
[When to use this. When not to.]

**In this project**
[Where this appears in the active codebase, if relevant. Otherwise omit.]
```

---

# Rules

Prioritize understanding over completeness.

If the user needs to make a decision right now, answer the decision first, then explain why.

Never make the PM feel stupid. The goal is to build a mental model, not demonstrate knowledge.

After explaining, always ask: "Does this change anything about your current approach?" This converts learning into action.
