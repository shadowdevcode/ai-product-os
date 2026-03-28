# Changelog

System-level changes to the AI Product OS framework. Pipeline issue work (product ideas, plans, QA results) is tracked in `experiments/` and `project-state.md`.

---

## 2026-03-28 — Learning: issue-008 (Nykaa Personalisation)

**What:** `/learning` cycle complete. 4 engineering rules, 1 product rule extracted. 3 agent files hardened. CODEBASE-CONTEXT.md generated.
**Why:** Closes the pipeline loop for issue-008. Key new system guardrails: fire-and-forget telemetry in hot paths, A/B salt server-only enforcement, metric-to-UI flow mapping requirement, frontend defensive programming standards.
**Files:** `knowledge/engineering-lessons.md`, `knowledge/product-lessons.md`, `knowledge/prompt-library.md`, `agents/backend-architect-agent.md`, `agents/backend-engineer-agent.md`, `agents/frontend-engineer-agent.md`, `apps/nykaa-personalisation/CODEBASE-CONTEXT.md`, `project-state.md`

## 2026-03-27 — Landing Page + Vercel Deployment

**What:** Static Next.js landing page at `apps/landing/` showcasing the pipeline, agents, and shipped products for the ICP.
**Why:** Vercel deployments were failing (no buildable app at root). Needed a public-facing page explaining what the OS does. Vercel root directory now set to `apps/landing`.
**Files:** `apps/landing/` (15 files), GitHub homepage URL updated to `ai-product-os-493e.vercel.app`

## 2026-03-27 — Developer Tooling

**What:** Root-level husky pre-commit/pre-push hooks, lint-staged, prettier. Enforcement scripts for secrets, file sizes, env files, function sizes, doc validation.
**Why:** Code was being committed without formatting or safety checks. Pre-commit hooks catch secrets and enforce consistency before code hits the repo.
**Files:** `package.json`, `.husky/`, `.lintstagedrc.json`, `.prettierrc`, `scripts/lib/`

## 2026-03-27 — Progressive Disclosure

**What:** Refactored CLAUDE.md from a monolithic 300-line file into contextual rules in `.claude/rules/` that auto-load by file pattern.
**Why:** CLAUDE.md was too large for agents to process efficiently. Rules now load only when relevant (e.g., tech-stack rules load only when editing `apps/**/*.ts`).
**Files:** `.claude/rules/` (6 rule files), `CLAUDE.md` (slimmed down)

## 2026-03-27 — Test Infrastructure

**What:** Vitest configs for all apps with shared base config and mock factories for Supabase, Neon, PostHog, Gemini.
**Why:** No automated tests existed. New API routes and lib functions now require colocated `.test.ts` files.
**Files:** `apps/*/vitest.config.ts`, `libs/shared/vitest.config.ts`, `libs/shared/test-utils.ts`

## 2026-03-27 — Agent Index + QA Automation + Next-Command Recommendation

**What:** AGENTS.md as central agent index. QA agent runs `npm test` before manual QA. Command protocol recommends next pipeline step.
**Why:** Agent discovery was hard. QA was fully manual. Users had to remember which command comes next.
**Files:** `AGENTS.md`, `agents/qa-agent.md`, `command-protocol.md`, `system-orchestrator.md`

## 2026-03-27 — System Evolution Tracking

**What:** CHANGELOG.md format standardized. README.md gets "System Evolution" section showing OS maturity arc (v0 → v1 → v2).
**Why:** System-level improvements had no visible trail. The PM meta-decisions — iterating on the process itself — were invisible to anyone reviewing the repo.
**Files:** `CHANGELOG.md`, `README.md`

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
