---
globs: ['knowledge/**/*.md']
---

# Knowledge Base Rules

## Structure

Knowledge files in this directory are the system's durable intelligence. They contain standards, patterns, and lessons extracted from production postmortems.

## Update Protocol

Knowledge files are updated ONLY during the `/learning` command by the Learning Agent. Do not modify knowledge files during other pipeline stages.

## Files and Their Purpose

- `product-principles.md` — Core product philosophy and decision frameworks
- `coding-standards.md` — TypeScript, Next.js, Supabase/Neon coding standards
- `architecture-guide.md` — Default system architecture patterns
- `ui-standards.md` — Design and component standards
- `analytics-framework.md` — PostHog event schema and funnel design
- `prompt-library.md` — Refined agent prompts from successful cycles
- `engineering-lessons.md` — Technical rules from postmortems
- `product-lessons.md` — Product patterns and anti-patterns
- `ai-model-guide.md` — Model selection per pipeline stage
- `readme-template.md` — Standard README structure for apps

## Consumption Rule

All agents must re-read these files at the start of every command execution to avoid repeating past mistakes.
