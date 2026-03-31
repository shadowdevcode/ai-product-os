# Changelog

## 2026-03-31 — Assign PR Reviewers (Automated Risk-Based Review Routing)

**What:** New standalone utility command `/assign-reviewers` that assesses PR risk from the actual code diff and routes accordingly.

- Created `.claude/commands/assign-reviewers.md` — skill stub that registers the command in Claude Code
- Created `commands/assign-reviewers.md` — full protocol: adversarial PR content handling, 5-tier risk model (Very Low → High), reviewer selection via `git log`/`git blame`, approval/unapproval logic, PR comment, Slack notification
- Created `.github/workflows/pr-auto-review.yml` — GitHub Action that triggers on `pull_request: [opened, synchronize]`, skips bot PRs, and calls `/assign-reviewers <PR-URL>` via Claude Code CLI

**Why:** Manual reviewer assignment is inconsistent and slow. Risk-based routing ensures high-risk PRs always get eyes, low-risk PRs get approved without friction, and the decision is derived from actual diffs — not PR description claims (adversarial input model).

**How triggers work:** GitHub Action fires on PR open and PR push (synchronize). It calls Claude Code CLI with `--dangerously-skip-permissions` in a non-interactive context, passing the PR URL. Slack notifications are opt-in via `SLACK_WEBHOOK_URL` secret.

**Required GitHub secrets:** `ANTHROPIC_API_KEY` (required), `SLACK_WEBHOOK_URL` (optional — skip Slack if absent).

**Pipeline isolation:** This command has no pipeline role. It does not read or write `project-state.md`, does not interact with `experiments/` or `knowledge/`, and cannot block or unblock any pipeline stage.

**Files:** `commands/assign-reviewers.md` (new), `.claude/commands/assign-reviewers.md` (new), `.github/workflows/pr-auto-review.yml` (new)

---

## 2026-03-29 — Global Claude Code Optimization (60-70% Cost Reduction)

**What:** Global `~/.claude/` configuration for cost and token optimization across all projects.

- Created `~/.claude/CLAUDE.md` — lean 16-line global instructions (context management, subagent tiers, efficiency habits)
- Updated `~/.claude/settings.json` — default model `opus` → `sonnet` (5x cheaper for 80% of tasks), `MAX_THINKING_TOKENS=10000` (70% thinking cost reduction from 32K default), `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50` (earlier compaction prevents context bloat)

**Why:** Project-level optimizations (knowledge subsetting, hooks) save 40-60% per command but only apply to this repo. Global settings compound those savings across all projects. Boris Cherny recommends lean CLAUDE.md for prompt cache efficiency (cached reads = 10% cost). Community consensus: Sonnet for 80%+ tasks, Opus only for adversarial/complex work.

**Sources:** Boris Cherny (Anthropic) — prompt caching, lean CLAUDE.md; community power users — model defaults, thinking token caps, auto-compaction thresholds

**Files:** `~/.claude/CLAUDE.md` (new), `~/.claude/settings.json` (modified)

---

## 2026-03-29 — 10x System Upgrade: Token Optimization, Mechanical Enforcement, Workflow Enhancement

**What:** Major system-wide upgrade inspired by Boris Cherny (Anthropic), Zevi Arnovitz (Meta PM), Harness Engineering, and ChatPRD/Lenny podcast practitioners.

### Phase 1: Token Optimization (40-60% reduction)

- Added `## Required Knowledge` sections to all 15 command files — each command now loads only relevant knowledge files instead of all 9 (2,820 lines)
- Updated loading directives in CLAUDE.md, command-protocol.md, and .claude/rules/commands.md
- Added `/compact` guidance section to CLAUDE.md
- Added model routing reminders (Opus) to peer-review and postmortem slash commands
- Updated all 12 .claude/commands/ files to reference command-level subsetting

### Phase 2: Mechanical Enforcement

- Created `scripts/lib/check-gate-before-write.js` — Claude Code PreToolUse hook blocks writes to apps/ when pipeline status is "blocked"
- Created `scripts/lib/check-patterns.js` — pre-commit grep checker for top 3 postmortem anti-patterns (fire-and-forget, missing .limit(), naked JSON.parse)
- Added hooks configuration to `.claude/settings.json` (PreToolUse gate check, PostToolUse function size check)
- Updated `.husky/pre-commit` with check-patterns.js and generate-claude-sections.js

### Phase 3: Workflow Enhancement

- Added `## 0 Task Breakdown` section to execute-plan.md — atomic task decomposition (name, files, size S/M/L, dependencies) presented to PM before any code is written
- Added Step 8.5 (context management advisory) to command-protocol.md
- Added Subagent Cost Tiers + Multi-Model Guidance to ai-model-guide.md (Haiku for exploration, Sonnet for implementation, Opus for adversarial review)
- Created `scripts/lib/generate-claude-sections.js` — auto-regenerates CLAUDE.md anti-patterns from engineering-lessons.md
- Added AUTO markers to CLAUDE.md anti-patterns section

### Phase 4: PM Portfolio System

- Created `pm-assets/` directory (gitignored) for personal PM career materials
- Created `pm-assets/README.md` with template structure (context.md, deck/, prd/, email-drafts/, interview-prep/)
- Added optional PM Portfolio Output section to deploy-check.md
- Hardened `.gitignore`: added pm-assets/, .claude/plans/, .claude/todos/, _.pptx, _.docx, \*\*/deck/, playwright artifacts

### Phase 5: Readiness Framework

- Created `knowledge/readiness-framework.md` — 5-pillar self-assessment (Pipeline Compliance, Knowledge Currency, Enforcement Coverage, Token Efficiency, Cycle Velocity) with 5 maturity levels (Bare → Autonomous)

**Why:** System was scoring 8.2/10 — excellent pipeline and learning loop but token-inefficient (all knowledge loaded every command), enforcement was prose-only (gates could be skipped), and no atomic task decomposition. These changes target 9.0+ by making enforcement mechanical, context lean, and execution granular.

**Sources:** Boris Cherny (lean context, /compact, lint rules from review), Zevi Arnovitz (strict plan execution, model specialization), Harness Engineering (three-layer enforcement, auto-markers, readiness pillars), ChatPRD/Lenny (atomic tasks, subagent cost tiers)

**Files:** 15 commands/_.md, 12 .claude/commands/_.md, CLAUDE.md, command-protocol.md, .claude/rules/commands.md, .claude/settings.json, .husky/pre-commit, .gitignore, knowledge/ai-model-guide.md, knowledge/readiness-framework.md, scripts/lib/check-gate-before-write.js, scripts/lib/check-patterns.js, scripts/lib/generate-claude-sections.js, pm-assets/README.md, commands/deploy-check.md

---

## 2026-03-28 — AI Product OS v2 Finalized (issue-008 Archived)

**What:** Final archival of the Nykaa Hyper-Personalization project.

- Implemented robust **Backend Product API** (`GET /api/catalog/product/[id]`) to replace client-side mocks.
- Refactored Product Details Page (PDP) to use server-side fetch for full "Backend Agent" compliance.
- Updated `project-state.md` and root `README.md` to reflect the completed and archived status of the MVP.
- Reset the pipeline to `idle` for the next project cycle.
  **Why:** Continuous improvement of the AI Product OS. Fixes the "missing backend" gap in issue-008 and ensures the repository is in a clean, professional state for portfolio review.
  **Files:** `apps/nykaa-personalisation/src/app/api/catalog/product/[id]/route.ts`, `apps/nykaa-personalisation/src/app/product/[id]/PDPContent.tsx`, `project-state.md`, `README.md`

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
