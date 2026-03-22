# Changelog

All notable changes to the AI Product OS are documented here.

---

## 2026-03-22 — claude-caliper + Zevi Alignment

### New Files
- `commands/eval.md` — /eval assertion-based grading command
- `libs/shared/posthog.ts` — shared PostHog template
- `libs/shared/db.ts` — shared Supabase template
- `libs/shared/error-handler.ts` — shared error handling template

### Modified Files
- `commands/execute-plan.md` — TDD mandate (§9), telemetry verification (§10), parallel worktree guidance (§11)
- `commands/create-plan.md` — JSON manifest requirement (§6)
- `commands/deploy-check.md` — Sentry verification (§7), automated PR creation (§8)
- `agents/backend-architect-agent.md` — Security pre-approval gate (RLS, auth, rate limiting, env vars)
- `knowledge/coding-standards.md` — Sentry integration section, shared libs reference
- `knowledge/ai-model-guide.md` — Specific model IDs per pipeline stage
- `CLAUDE.md` — /eval added to utility commands, libs/shared added to repo structure

### Why
Gaps identified from claude-caliper evaluation and Zevi Arnovitz meta-PM workflow alignment.
- **P0**: TDD mandate, JSON manifest, auto-PR
- **P1**: Security pre-approval gate, Sentry verification, multi-model routing
- **P2**: /eval command, shared libs, parallel worktrees
