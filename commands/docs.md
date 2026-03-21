# Command: /docs

Purpose:
Generate AI-native codebase documentation for the active project.

This command creates a `CODEBASE-CONTEXT.md` file inside the app directory. Its purpose is to give any future AI agent session instant understanding of the codebase without requiring manual re-explanation.

Inspired by Zevi Arnovitz's AI-native documentation practice: plain-text markdown files that tell future agents what the codebase is, how it works, and what not to touch.

---

# When to Run

Run `/docs` at the end of any significant implementation cycle, or whenever:

- A new major feature is added
- The architecture changes
- You are about to hand off the project to a new agent session
- The existing `CODEBASE-CONTEXT.md` is more than 2 weeks old

`/docs` is automatically run as part of `/learning`. You can also run it standalone at any time.

---

# Agent Activated

docs-agent.md (if available), otherwise the active engineering agent reads the codebase directly.

---

# Context Loading

1. Read `project-state.md` → extract `active_issue`, `project_name`
2. Read `apps/<project_name>/` directory structure
3. Read `apps/<project_name>/schema.sql`
4. Read `apps/<project_name>/package.json`
5. Read key source files (layout, main page, API routes, lib utilities)
6. Read existing postmortem if available: `experiments/results/postmortem-<issue_number>.md`

---

# Execution Steps

## Step 1 — Understand the App

Read the codebase to understand:
- What user problem does this app solve?
- What is the primary user flow (from landing to value)?
- What are the most important files?
- What are the key API endpoints?
- What does the database schema look like?
- What AI model is used and what does it do?
- What analytics events are tracked?

## Step 2 — Identify Fragile Patterns

Look for:
- Non-obvious architectural decisions that are easy to accidentally break
- Patterns that look redundant but are there for a reason
- External dependencies with important constraints (rate limits, auth flows, timing requirements)
- Any TODOs or known limitations left in the code

## Step 3 — Write CODEBASE-CONTEXT.md

Write the file to `apps/<project_name>/CODEBASE-CONTEXT.md`.

---

# Output Format

```markdown
# Codebase Context: <project_name>
Last updated: YYYY-MM-DD

## What This App Does
[One paragraph: the user problem, the core feature, and the primary user flow.]

## Architecture Overview
- **Frontend**: [tech stack, key files, main page location]
- **Backend**: [API route location, key endpoints]
- **Database**: [Supabase schema summary, key tables and relationships]
- **AI Integration**: [model name, what it does, where it's called]
- **Analytics**: [PostHog events tracked, key funnels]

## Key Files
| File | Purpose |
|---|---|
| src/app/page.tsx | Main UI, primary user interaction |
| src/app/api/.../route.ts | [describe each API route] |
| src/lib/supabase.ts | Supabase client configuration |
| schema.sql | Database schema (run in Supabase SQL Editor) |

## Data Model
[Brief table-by-table description. For each table: name, purpose, key columns, relationships.]

## API Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | /api/... | [what it does] |
| GET | /api/... | [what it does] |

## Auth Flow
[How authentication works. Provider used. Where session is checked.]

## Things NOT to Change Without Reading First
[List any fragile patterns, non-obvious decisions, or architectural constraints that would be easy to accidentally break.]

## Known Limitations / Future Work
[TODOs and known issues from postmortem or code comments.]
```

---

# Rules

Write for a future AI agent, not a human developer. Assume the reader has zero context about this project.

Be specific. "Next.js App Router" is not useful. "Main UI is in `src/app/page.tsx`, task persistence via `POST /api/tasks`, Supabase client in `src/lib/supabase.ts`" is useful.

Do not summarize. Show where things are.

Update this file after every significant feature addition or architectural change.
