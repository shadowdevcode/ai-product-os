# Changelog

## 2026-04-04 — GitHub PR #15 + project state (repo hygiene)

**What:** Pushed `feat/linear-workflow-sync` (commits `9f483ed`, `dced451`) and opened [**PR #15**](https://github.com/shadowdevcode/ai-product-os/pull/15) for review: Neon MCP secret removal, `.codex/config.toml`, CHANGELOG updates.

**Docs:** [project-state.md](project-state.md) updated — `last_commit` `dced451`, `open_pr_link` → PR #15, decisions log entry for MCP/Codex hygiene.

**Linear:** [VIJ-11](https://linear.app/vijaypmworkspace/issue/VIJ-11/issue-009-moneymirror-ai-powered-personal-finance-coach-for-gen-z) is **Done** (API check 2026-04-04). [experiments/linear-sync/issue-009.json](experiments/linear-sync/issue-009.json) still reflects last pipeline sync **2026-04-04T08:22:36Z** (`phase-1-rollout-closeout`); no new `/linear-sync` run for MCP-only commits (PM milestone unchanged). `pr_link` in the JSON map points to PR #15 as the active review link.

---

## 2026-04-04 — Codex MCP: project-scoped Neon (config.toml)

**What:** OpenAI Codex does not read `.mcp.json`; it uses TOML under [`.codex/config.toml`](.codex/config.toml). Added a **committed-safe** project config that wires Neon’s streamable HTTP MCP via **`bearer_token_env_var = "NEON_API_KEY"`** (no secrets in Git).

**Setup:**

1. Create or rotate a Neon API key in [Neon Console](https://console.neon.tech).
2. Export the key where Codex runs, e.g. `export NEON_API_KEY="napi_…"` in `~/.zshrc` / `~/.bashrc`, or configure your terminal/IDE env so Codex inherits it.
3. In Codex, mark this repo as a **trusted project** so project-scoped MCP loads (see Codex docs).
4. **Cursor / Claude Code** still use a **local gitignored** [`.mcp.json`](.mcp.json) from [`.mcp.json.example`](.mcp.json.example) if you need manual HTTP MCP; you can paste the same key there or rely on the Neon Cursor plugin + MCP UI.

**Other MCP servers (Linear, Vercel, etc.):** Add via `codex mcp add …` or extra `[mcp_servers.*]` tables per [Codex MCP docs](https://developers.openai.com/codex/mcp); do not commit bearer tokens—use `bearer_token_env_var` or OAuth (`codex mcp login`) where supported.

---

## 2026-04-04 — Security: Neon MCP API key removed from repository

**What:** A Neon API key was committed in project-root `.mcp.json`. That key must be treated as compromised.

**Required (human, Neon Console):**

1. **Revoke** the leaked key immediately: [Neon Console](https://console.neon.tech) → Account settings → API keys (or organization keys, depending on where `napi_…` keys are managed).
2. **Create a new key** for local use only. Never commit it.

**Repository changes:**

- Removed tracked [`.mcp.json`](.mcp.json) and added [`.mcp.json`](.mcp.json) to [`.gitignore`](.gitignore) so local MCP config stays out of Git.
- Added [`.mcp.json.example`](.mcp.json.example) as a template (placeholder only, no secrets).

**How to configure Cursor safely:**

- Prefer the **Neon Postgres** Cursor plugin (already enabled under [`.cursor/settings.json`](.cursor/settings.json)) and complete auth in **Cursor → Settings → MCP**.
- If you need a manual HTTP MCP entry: copy `.mcp.json.example` → `.mcp.json`, paste your **new** key, and keep `.mcp.json` local (gitignored).

**Git history:** Old commits may still contain the leaked secret. Revoking the key in Neon closes the practical risk. To remove the blob from history (e.g. public fork), use `git filter-repo` or similar on a coordinated branch and force-push, understanding collaborator impact.

---

## 2026-04-04 — MoneyMirror Vercel Deploy Attempt: Runtime Fix Applied, Release Still Blocked

**What:** Executed the `VIJ-20` production deploy attempt for `apps/money-mirror`, fixed one Vercel runtime incompatibility in code, created the Vercel project, and captured the remaining production blocker.

**Vercel setup completed:**

- Created project `money-mirror` under scope `vijay-sehgals-projects`
- Linked local app directory to the Vercel project
- Synced production env vars from `apps/money-mirror/.env.local`
- Corrected `NEXT_PUBLIC_APP_URL` to the real assigned alias: `https://money-mirror-rho.vercel.app`

**Code fix applied:**

- Replaced `apps/money-mirror/middleware.ts` with `apps/money-mirror/proxy.ts`
- Why: the initial production deploy failed because Vercel rejected `@neondatabase/auth/next/server` inside the Edge `middleware` runtime
- Result: Next 16 auth gating now runs through the Node `proxy` file convention instead of Edge middleware

**Validation after the fix:**

- `npm test` PASS (45 tests)
- `npx next build --webpack` PASS
- `npx tsc --noEmit` PASS after regenerating `.next/types`
- Vercel production build PASS

**Remaining blocker:**

- Public deployment URLs are protected by Vercel Authentication (`401 Authentication Required`)
- Even authenticated `vercel curl` requests still return `NOT_FOUND` for `/`, `/login`, `/dashboard`, and `/api/cron/weekly-recap`
- This indicates the release is still blocked by Vercel project/public routing configuration, not by the app build itself

**Why:** The original remaining task for Phase 1 was deploy + production verification. That surfaced two separate production issues: one app/runtime issue (fixed) and one Vercel serving/protection issue (still open).

---

## 2026-04-04 — MoneyMirror Phase 1 Live Smoke Complete + Gemini Timeout Fix

**What:** Completed full Phase 1 rollout validation against live external services (Neon Auth, Gemini, Neon DB).

**Neon schema migration:**

- Applied 7 `ALTER TABLE` statements to live DB `steep-meadow-97750093`
- `profiles` gained `monthly_income_paisa BIGINT`
- `statements` gained `institution_name`, `statement_type` (with CHECK constraint), `due_date`, `payment_due_paisa`, `minimum_due_paisa`, `credit_limit_paisa`

**Smoke test results (all via Playwright against `http://localhost:3000`):**

- Dev server boot: Next.js 16 Turbopack ready in ~440ms ✅
- Cron gate: 401 unauthenticated, 200 with `x-cron-secret` ✅
- OTP login: email submitted, OTP entered, session established ✅
- Bank account upload (Kotak Feb 2026): 24 transactions, ₹31,926 debits — DB confirmed `status=processed` ✅
- Credit card upload (HDFC Feb–Mar 2026): 18 transactions, ₹16,245 spent, credit card fields rendered — DB confirmed ✅

**Bug fix — Gemini 2.5 Flash timeout:**

- `gemini-2.5-flash` has thinking enabled by default in 2026. On 10K-char PDF text, this exceeded the 25s route timeout.
- Fixed in `apps/money-mirror/src/app/api/statement/parse/route.ts`: added `config: { thinkingConfig: { thinkingBudget: 0 } }` to the `generateContent` call.
- Response time reduced from >25s (timeout) to ~8s.

**Linear cleanup (VIJ-11 children):**

- VIJ-12 → Duplicate, VIJ-14 → Cancelled, VIJ-15 → Duplicate
- VIJ-13 restructured as `[MoneyMirror] Phase 1 Rollout Validation`, In Progress
- 6 child sub-issues created: VIJ-16 (schema, Done), VIJ-17 (OTP, Done), VIJ-18 (bank upload, Done), VIJ-19 (CC upload, Done), VIJ-20 (Vercel deploy, Todo), VIJ-21 (cron gate, Done)

**Why:** DB schema drift blocked all live smoke. Gemini thinking mode silently broke PDF parsing on the happy path.

---

## 2026-04-03 — MoneyMirror Phase 1 Rollout Validation Started

**What:** Started the real rollout-validation pass for `apps/money-mirror` and synced the findings into Linear and repo state.

- Created dedicated Linear follow-up issue `VIJ-13` for the live smoke and rollout checklist.
- Marked duplicate follow-up `VIJ-14` as Duplicate to keep one canonical validation thread.
- Verified local runtime behavior:
  - `npm run dev` boots successfully outside the sandbox
  - unauthenticated `GET /api/cron/weekly-recap` returns `401`
  - authenticated `GET /api/cron/weekly-recap` with `x-cron-secret` returns `200 {"ok":true,"total":0,"succeeded":0,"failed":0}`
- Verified the target Neon DB is still behind the repo schema:
  - `profiles` is missing `monthly_income_paisa`
  - `statements` still uses `bank_name`
  - `statements` is missing `institution_name`, `statement_type`, and the new credit-card due metadata columns

**Why:** The repo now contains Phase 1 expansion code for explicit `bank_account` and `credit_card` flows, but the live DB has not yet been migrated. Until `apps/money-mirror/schema.sql` is applied, the real OTP/onboarding/upload smoke cannot validate the current app behavior.

---

## 2026-04-03 — /learning Issue-009: 7 Engineering Rules Extracted + 5 Agent Files Updated

**What:** Completed the /learning command for MoneyMirror (issue-009). Extracted 7 durable engineering rules from the postmortem and applied Prompt Autopsy changes to 5 agent/command files.

**Engineering rules written to `knowledge/engineering-lessons.md`:**

1. Dashboard/report pages linked from email CTAs must specify a first-load rehydration path (read path) — the post-mutation result path is insufficient.
2. Parent + child write sequences must declare an explicit atomicity strategy — partial success (`parent = processed, children = missing`) is never a terminal state.
3. Fan-out worker HTTP contracts must use non-2xx status for failure — master must not inspect JSON body for success/failure accounting.
4. Auth route fixes must update all callers in the same change — a route auth fix without caller verification is an incomplete fix.
5. `.env.local.example` must be generated by grepping `process.env.*` in source — not from memory. Key name divergence is a deploy blocker.
6. File size limits (route < 200 lines, page < 250 lines) must be applied during code generation — not discovered at pre-commit hook rejection.
7. Third-party library API must be verified against installed version before marking integration complete — training knowledge is not sufficient.

**Agent/command files updated per Prompt Autopsy:**

- `agents/backend-architect-agent.md`: 3 new Mandatory Pre-Approval Checklist items (10: rehydration path, 11: write atomicity, 12: fan-out HTTP contract)
- `agents/backend-engineer-agent.md`: 2 hard rules (auth caller cross-verification, file size budget at generation time)
- `agents/code-review-agent.md`: 2 new checks (authenticated route caller verification = CRITICAL, parent/child write sequence check = CRITICAL)
- `agents/qa-agent.md`: env var key name cross-check added as standalone QA dimension with grep-based verification
- `commands/execute-plan.md`: env var grep step in §8 completion checklist; read/write path checkpoint + third-party library verification in §5; file size budget rule as §5b

**Also written:** `apps/money-mirror/CODEBASE-CONTEXT.md` — full AI context file for future agent sessions.

**Why:** Recurring failure patterns from issue-009 (2nd consecutive parent/child write atomicity gap, 3rd consecutive env var naming issue, file size violations deferred 3 stages). Upstream enforcement needed to break these cycles.

---

## 2026-04-03 — Shift-Left Infra Validation: Gate 0 + Empty ENV Detection + Execute-Plan Provisioning Checklist

**What:** Three coordinated changes to eliminate the "tests pass, app broken locally" failure pattern discovered during issue-009 analysis.

**Change 1 — `/deploy-check` Gate 0 (manual smoke test):**
Added a pre-flight checklist (Gate 0) that the PM runs manually before triggering `/deploy-check`. Six checkboxes: dev server boots, OTP login works, onboarding writes to DB, core feature works end-to-end, no 500 errors, no empty env vars. If any fail, fix before running the command. Updated the Output Format to include "Local Smoke Test (Gate 0 — PM confirmed)" as the first line.

**Change 2 — `/deploy-check` ENV gate upgrade (empty value detection):**
The existing ENV gate only checked that variable names appeared in `.env.local.example`. Upgraded it to read `.env.local` directly and classify each variable as FILLED / EMPTY / MISSING. Empty values (`VAR=` or `VAR=""`) are now a blocking violation — previously they passed as "present". Variables explicitly marked `# Optional` are exempt.

**Change 3 — `/execute-plan` + `backend-engineer-agent.md` infra provisioning:**
Added a 6-item infrastructure provisioning checklist to the execute-plan completion criteria. DB project created, schema applied and verified, auth provider provisioned (e.g., Neon Auth URL obtained), all non-optional env vars filled, Sentry project created and configured, `npm run dev` boots clean. These are now **hard deliverables** — not README suggestions. Also moved Sentry setup from deploy-check into execute-plan's Backend Implementation section: `npm install @sentry/nextjs`, wizard run, all 4 Sentry vars filled. The backend-engineer-agent.md `# Rules` section now lists all 6 as explicit hard constraints.

**Why:** Issue-009 analysis revealed that `NEON_AUTH_BASE_URL` was empty in `.env.local` — OTP login would have failed immediately on local test. `RESEND_API_KEY` was also empty, meaning recap emails silently fail (returning 200 but not sending). The current ENV gate in deploy-check passed both because it only checked variable name presence in `.env.local.example`, not actual values. The root cause: infra setup (Neon Auth provisioning, Sentry project creation) has no enforcement point in the pipeline — it lives only as prose in README.md. Deploy-check discovered these gaps too late (after PR creation). The fix shifts this validation to execute-plan, where the engineer is still in implementation mode.

**Files:** `commands/deploy-check.md` (Gate 0 added, §2 ENV gate upgraded, output format updated), `commands/execute-plan.md` (§2 Sentry setup added, §8 infra provisioning checklist added), `agents/backend-engineer-agent.md` (# Rules section updated with 6-item infra checklist)

---

## 2026-04-02 — Proactive DB Schema + ENV Verification in /deploy-check

**What:** Upgraded `/deploy-check` so that database schema application and ENV completeness are enforced as **blocking gates** during the command, not left as unchecked items in the PR body for a reviewer to discover.

- **New §3a** (Database Schema Verification): Agent reads `schema.sql`, extracts all `CREATE TABLE` table names, then either queries `information_schema.tables` via MCP (Supabase/Neon) to verify each table exists, or — if MCP is unavailable — prints a blocking prompt listing every required table and instructs the user to apply the schema before continuing. Deployment is blocked if any table is missing or the user hasn't confirmed.
- **Updated §2** (ENV Completeness Check): Agent greps `apps/<project>/src/` for all `process.env.*` references and diffs against `.env.local.example`. Any var in code but missing from the example file is a **BLOCKING violation** that stops the command.
- **Updated §8 PR body**: Removed `[ ] Apply schema.sql` and `[ ] Set env vars` as reviewer TODOs — replaced with pre-checked `[x] Schema verified` and `[x] ENV verified` lines, because these are now confirmed before PR creation.

**Why:** Across multiple pipeline cycles (issues 002–006, 009), the schema and ENV steps were only surfaced as PR checklist items that reviewers were expected to catch. This caused silent deploy failures: the PR was merged, the app was pushed, and only then did the missing tables or missing env vars surface. The gate must fire _before_ the PR is created.

**Anti-pattern fixed**: "Schema applied post-PR = silent deploy failure" (engineering-lessons.md, issue-002 entry).

**Files:** `commands/deploy-check.md` (§2 ENV check added, §3a schema verification added, §8 PR body updated), `CHANGELOG.md`

---

## 2026-04-02 — Real-Time Feedback Capture + Mandatory Linear Sync

**What:** Added two hard rules to the system that were previously missing: (1) PM feedback during any pipeline stage must be captured immediately into the relevant agent/command file and CHANGELOG — not deferred to `/learning`. (2) Linear sync checkpoints are now mandatory, not "recommended" — if a sync is skipped, the next command must run it before proceeding.

**Why:** PM feedback during issue-009's pipeline was not being captured into the agent files in real time, creating risk that corrections would be lost if the cycle was abandoned or compacted. Linear syncs were being skipped because the language in CLAUDE.md and command-protocol.md said "recommended" rather than enforcing them.

**Files:** `CLAUDE.md` (Real-Time Feedback Capture section added, Linear checkpoints changed from Recommended to Mandatory), `command-protocol.md` (Real-Time Feedback Capture Protocol section added, CHANGELOG Discipline section added, Linear checkpoints made mandatory)

---

## 2026-04-02 — /review Command + Code Review Agent Upgrade (Zevi Gap Analysis)

**What:** Strengthened `/review` command and `code-review-agent.md` based on a benchmark against Zevi Arnovitz's (Meta PM, Lenny's Podcast) code review command. Added what was genuinely better; kept our competitive advantages.

**Added to both files:**

- Formal severity ladder: CRITICAL / HIGH / MEDIUM / LOW with project-specific definitions (PostHog dual-emission explicitly labeled CRITICAL)
- Structured output format: `Looks Clean` pass-list + `Issues Found` with `file:line` format + `Summary` block with issue counts and recommendation
- Explicit production readiness checks: no `console.log`, no TODOs/FIXMEs, no hardcoded secrets, no `@ts-ignore`
- React/Hooks review step (scoped strictly to `"use client"` files): effect cleanup, dependency arrays, infinite loop patterns
- Client-side performance sub-checks under Step 5 (`useMemo`, `useCallback`, unnecessary re-renders) — also scoped to Client Components only

**Preserved (our advantages Zevi doesn't have):**

- PostHog dual-emission check as a named CRITICAL block with exact grep instructions
- Architecture check diffs against the actual plan doc (not generic "follows patterns")
- Knowledge file loading (`engineering-lessons.md` keeps postmortem rules active)
- Pipeline gate integration and quality gate enforcement

**What we did NOT copy:** emoji formatting, generic architecture check, project-agnostic output.

**Files:** `commands/review.md` (updated), `agents/code-review-agent.md` (updated)

---

## 2026-04-01 — Linear PM Layer (Retroactive Sync + Auto-Bind)

**What:** Full Linear integration layer added as a PM-facing workflow mirror. The repo remains the source of truth; Linear reflects state for stakeholder visibility.

- Created `commands/linear-bind.md` — binds active repo issue to a Linear team and project; creates `experiments/linear-sync/issue-<NNN>.json` sync map; writes `linear_enabled: true` and all binding fields to `project-state.md`
- Created `commands/linear-sync.md` — mirrors repo artifacts into Linear in 4 modes: `issue` (brief), `plan` (document snapshot + child issues from manifest), `status` (stage labels + blockers), `release` (PR/deployment links)
- Created `commands/linear-brief.md` — read-only summary of current Linear view; compares repo stage against Linear status; identifies mismatches
- Created `commands/linear-close.md` — finalizes Linear project after `/learning`; sets project to `completed`, root issue to `Done`, creates closeout snapshot document
- Created `agents/linear-agent.md` — Linear Agent role definition (product operations specialist); idempotent sync behavior; repo-as-source-of-truth constraint
- Created `knowledge/linear-operations.md` — shared runtime rules: sync map schema, naming conventions, label taxonomy (`AI Product OS` parent + 7 children), status mapping, failure policy
- Registered all 4 commands as `.claude/commands/` stubs
- Added Linear PM Layer section to `CLAUDE.md` with recommended sync checkpoints
- Updated `commands/create-issue.md` to auto-bind Linear at the end of every new issue creation (no manual `/linear-bind` step required going forward)
- Retroactively synced issues 002–006 and 008 to Linear as `Completed`

**Why:** Pipeline had no PM-facing visibility layer. Issues were built, shipped, and archived with zero Linear record. Linear now mirrors all 6 completed projects with closeout snapshots, enabling portfolio visibility and cycle velocity tracking.

**Pipeline isolation:** Linear commands are utility-only. They do not alter stage progression, do not interact with `experiments/` artifact content, and cannot block or unblock pipeline stages.

**Files:** `commands/linear-bind.md` (new), `commands/linear-sync.md` (new), `commands/linear-brief.md` (new), `commands/linear-close.md` (new), `agents/linear-agent.md` (new), `knowledge/linear-operations.md` (new), `.claude/commands/linear-*.md` (4 new stubs), `CLAUDE.md` (updated), `commands/create-issue.md` (updated), `experiments/linear-sync/issue-{002,003,004,005,006,008}.json` (new)

---

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
