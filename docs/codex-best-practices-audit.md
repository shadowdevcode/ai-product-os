# Codex Best Practices Audit

Date: 2026-04-30

Scope: Read-only audit of `/Users/vijaysehgal/Downloads/02-Portfolio/ai-product-os` against OpenAI Codex best practices.

Source baseline: https://developers.openai.com/codex/learn/best-practices

## Verdict

The project is partially following Codex best practices.

It is strong on durable context, `AGENTS.md`, planning before coding, review loops, MCP usage, and using subagents for bounded exploration. It is weaker on Codex-native portability, executable automation, CI validation, and instruction drift.

OpenAI's Codex best-practices guidance emphasizes clear goal/context/constraints/done-when prompts, planning for complex tasks, practical `AGENTS.md`, durable config/MCP setup, tests and review before accepting work, scoped skills, automations for stable repeated work, and bounded subagents for exploration or triage.

## What The Repo Does Well

- Durable workflow context is strong: `AGENTS.md`, `CLAUDE.md`, and `project-state.md` give agents clear state, roles, and pipeline gates.
- Planning and staged execution are mature: `commands/execute-plan.md` requires task breakdown and PM approval before coding.
- Review and QA discipline is better than average: `commands/review.md` has severity gates, and MoneyMirror has meaningful Vitest and Playwright scripts in `apps/money-mirror/package.json`.
- MCP and external workflow thinking exists: Linear, Neon, Vercel, and codebase-memory are documented or configured, with Codex project MCP intentionally conservative in `.codex/config.toml`.
- Durable learning loop exists: postmortems and `/learning` feed lessons back into agents, knowledge files, and `CODEBASE-CONTEXT.md`.

## Main Gaps

1. No real CI validation.
   - Evidence: `.github/workflows/pr-auto-review.yml` only installs Claude Code and runs reviewer assignment.
   - Impact: lint, typecheck, tests, builds, and E2E checks are not enforced before merge.

2. Instruction drift exists.
   - Evidence: `commands/` and `.claude/commands/` are duplicated and not guaranteed equivalent.
   - Impact: documented command behavior can diverge from registered command behavior.

3. Knowledge-loading rules conflict.
   - Evidence: `CLAUDE.md` and `command-protocol.md` prefer command-scoped knowledge loading, while `system-orchestrator.md` and `.claude/rules/knowledge.md` say agents must read all knowledge files.
   - Impact: agents can over-load context or follow different execution protocols.

4. Technical rules conflict.
   - Evidence: `.claude/rules/code-quality.md` says never fire-and-forget promises in API routes, while newer telemetry guidance requires fire-and-forget PostHog with `.catch()` in latency-sensitive paths.
   - Impact: reviewers and implementers can make opposite calls on the same code.

5. App-local `AGENTS.md` is too thin.
   - Evidence: `apps/money-mirror/AGENTS.md` only warns about Next.js version behavior.
   - Impact: Codex gets little app-specific architecture, validation, or risk guidance when working inside the app.

6. Codex-native portability is partial.
   - Evidence: the repo is heavily Claude-native through `CLAUDE.md`, `.claude/commands`, and `.claude/rules`.
   - Impact: Codex can read the repo, but the canonical workflow is not fully expressed in Codex-first surfaces.

7. Automation is advisory, not enforceable.
   - Evidence: hooks and scripts exist, but several checks are advisory or omitted from root `check:all`.
   - Impact: repeated workflow checks still rely on agent discipline instead of a hard automation backstop.

8. Env template tracking risk.
   - Evidence: app `.gitignore` patterns can ignore `.env.local.example`, while docs expect that file to exist.
   - Impact: onboarding, deploy checks, and agent setup can fail because expected env templates are missing or untracked.

## Recommended Priority Order

1. Add a standard CI workflow for active apps: install, lint, typecheck, test, build, and optionally Playwright smoke.
2. Add `typecheck` and `validate` scripts to `apps/money-mirror/package.json`, plus root scripts that delegate to active apps.
3. Pick one canonical command source and add drift detection for `.claude/commands` vs `commands/`.
4. Resolve the two instruction conflicts: knowledge-loading scope and telemetry fire-and-forget exception.
5. Expand root and app `AGENTS.md` for Codex-native usage, especially MoneyMirror.
6. Add an MCP runtime matrix covering Codex, Claude, Cursor, VS Code, and intentionally disabled integrations.

## Subagent Slices

- `019dddab-d357-7390-9ad3-e3a4c48ac99a`: reusable guidance, `AGENTS.md`, workflow docs.
- `019dddab-d380-71e0-b685-c20df9279445`: testing, validation, CI, review gates.
- `019dddab-d3c2-7df3-9c58-1498889062ea`: architecture, tooling, MCP, automation, drift.

## Files Inspected

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `project-state.md`
- `command-protocol.md`
- `system-orchestrator.md`
- `.codex/config.toml`
- `.cursor/settings.json`
- `.vscode/mcp.json`
- `.github/workflows/pr-auto-review.yml`
- `.claude/settings.json`
- `.claude/settings.local.json`
- `.claude/rules/agents.md`
- `.claude/rules/commands.md`
- `.claude/rules/code-quality.md`
- `.claude/rules/knowledge.md`
- `.claude/rules/testing.md`
- `.claude/rules/tech-stack.md`
- `.husky/pre-commit`
- `.husky/pre-push`
- `.lintstagedrc.json`
- `package.json`
- `.gitignore`
- `commands/assign-reviewers.md`
- `commands/create-issue.md`
- `commands/create-plan.md`
- `commands/deploy-check.md`
- `commands/deslop.md`
- `commands/docs.md`
- `commands/execute-plan.md`
- `commands/gmail-sync.md`
- `commands/learning.md`
- `commands/linear-bind.md`
- `commands/linear-sync.md`
- `commands/peer-review.md`
- `commands/qa-test.md`
- `commands/review.md`
- `agents/backend-engineer-agent.md`
- `agents/code-review-agent.md`
- `agents/learning-agent.md`
- `agents/qa-agent.md`
- `knowledge/engineering-lessons.md`
- `knowledge/linear-operations.md`
- `knowledge/prompt-library.md`
- `experiments/linear-sync/issue-013.json`
- `experiments/plans/manifest-013.json`
- `experiments/results/review-012.md`
- `experiments/results/peer-review-012.md`
- `experiments/results/qa-test-012.md`
- `experiments/results/deploy-check-012.md`
- `experiments/results/postmortem-012.md`
- `apps/money-mirror/AGENTS.md`
- `apps/money-mirror/CLAUDE.md`
- `apps/money-mirror/README.md`
- `apps/money-mirror/CODEBASE-CONTEXT.md`
- `apps/money-mirror/package.json`
- `apps/money-mirror/tsconfig.json`
- `apps/money-mirror/vitest.config.ts`
- `apps/money-mirror/playwright.config.ts`
- `apps/money-mirror/eslint.config.mjs`
- `apps/money-mirror/next.config.ts`
- `apps/money-mirror/e2e/smoke.spec.ts`
- `apps/money-mirror/vercel.json`
- `apps/money-mirror/.gitignore`
- `apps/money-mirror/.env.local.example`
- `apps/research-copilot/README.md`
- `apps/research-copilot/package.json`
- `apps/research-copilot/.env.local.example`
- `apps/research-copilot/src/lib/db.ts`
- `apps/research-copilot/src/lib/ai/openrouter.ts`
- `apps/nykaa-personalisation/AGENTS.md`
- `apps/nykaa-personalisation/CLAUDE.md`
- `src/README.md`
- `src/package.json`
- `scripts/lib/check-drift.js`
- `scripts/lib/check-env-files.js`
- `scripts/lib/check-file-sizes.js`
- `scripts/lib/check-function-sizes.js`
- `scripts/lib/check-gate-before-write.js`
- `scripts/lib/check-test-colocation.js`
- `scripts/lib/validate-docs.js`
