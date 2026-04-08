# Command: /deploy-check

## Required Knowledge

Load only these knowledge files before executing:

- knowledge/coding-standards.md
- knowledge/architecture-guide.md
- knowledge/readme-template.md

---

Purpose:
Verify that the system is safe and ready to deploy.

This command activates the Deployment Readiness Agent to validate build status, infrastructure readiness, and deployment safety.

---

# Role

You are responsible for ensuring the system is production ready.

You must block deployment if critical issues exist.

---

# Input

You will receive:

QA Test Results
Code Review Results
Peer Review Results
Frontend Implementation
Backend Implementation
Infrastructure Requirements

---

# Process

Follow this sequence.

---

## 0 Local Smoke Test (PM runs manually before triggering /deploy-check)

**This gate must pass before running the command.** If any checkbox fails, fix the infra/env issue first — do not run `/deploy-check` against a broken local environment.

```
□ `npm run dev` starts without errors (port 3000 accessible)
□ /login loads and OTP is sent successfully (Neon Auth is provisioned + NEON_AUTH_BASE_URL filled)
□ Onboarding completes (DB write to profiles table succeeds)
□ Core feature works end-to-end (e.g., PDF upload parses, dashboard loads with data)
□ No 500 errors in browser console or terminal
□ All non-optional env vars have real values in .env.local (not empty strings)
```

If any checkbox fails → diagnose and fix before proceeding. Common causes:

- `NEON_AUTH_BASE_URL` empty → provision Neon Auth on the project, copy the URL
- Missing API keys → get them from the relevant service dashboard
- Schema not applied → run `schema.sql` in Neon/Supabase SQL editor

# Added: 2026-04-03 — Shift-left infra validation; catch env/auth gaps before PR creation

---

## 1 Build Verification

Ensure all components build successfully.

Examples:

frontend build succeeds
backend services start correctly
dependencies install without errors

---

## 2 Environment Configuration

Verify required environment variables.

Examples:

database connection string
API keys
AI model credentials

Ensure secrets are not exposed.

**ENV Completeness Check (blocking)**:

1. Scan `apps/<project-name>/src/` for all `process.env.*` references using grep.
2. Compare the full list against `.env.local.example` — report any variable present in code but missing from `.env.local.example` as a **BLOCKING violation**.
3. Read `.env.local` directly and check each variable's value. Classify each as:
   - ✅ FILLED — has a real value
   - ⚠️ EMPTY — present in file but value is blank (`VAR=` or `VAR=""`)
   - ❌ MISSING — not in file at all
4. Report EMPTY variables as a **BLOCKING violation** — a variable that exists in the file with no value is just as broken as one that's missing.
5. Exception: variables explicitly marked `# Optional` in `.env.local.example` may be empty without blocking.
6. Optionality must be explicit at definition-site: each optional variable must have an adjacent `# Optional` annotation near that key. If a variable behaves as optional in code/docs but is unlabeled in `.env.local.example`, require updating `.env.local.example` in this cycle before approval.

# Added: 2026-04-02 — ENV completeness must be a gate, not a checklist item

# Updated: 2026-04-03 — Distinguish EMPTY vs MISSING; empty values are a blocking violation

---

## 3 Infrastructure Readiness

Confirm infrastructure is configured.

Examples:

database instance exists
storage service configured
API server environment ready

---

## 3a Database Schema Verification (blocking)

Before proceeding, verify the database schema has been applied to the remote instance.

**Step 1**: Read `apps/<project-name>/schema.sql` and extract all `CREATE TABLE` table names.

**Step 2**: Attempt verification using MCP tools if available:

- Query `information_schema.tables WHERE table_schema = 'public'`
- Check each expected table exists
- Report pass/fail per table

**Step 3**: If MCP is unavailable, print a blocking prompt to the user:

```
⚠️  DATABASE SCHEMA CHECK REQUIRED

The following tables must exist in your Supabase/Neon instance before deployment:
  - [table_1]
  - [table_2]
  - ...

To apply:
  1. Open Supabase SQL Editor (or Neon console)
  2. Run the full contents of apps/<project-name>/schema.sql
  3. Verify tables appear in the Table Editor

Confirm tables are applied before proceeding. Do not continue until this is done.
```

**Block deployment if**:

- MCP query shows any expected table is missing
- User has not confirmed tables are applied when MCP is unavailable

**Fallback verification path (before blocking)**:

When MCP is unavailable, attempt direct DB verification using the app's configured DB client and `DATABASE_URL` (for example, a short script querying `information_schema.tables`). If direct verification succeeds with evidence, do not block on MCP unavailability alone.

# Added: 2026-04-07 — MoneyMirror issue-012

# Added: 2026-04-02 — Schema verification must be a blocking gate, not a PR reviewer TODO

---

## 4 Monitoring and Logging

Verify monitoring exists.

Examples:

error logging
request logging
performance metrics

---

## 5 Rollback Plan

Ensure rollback is possible.

Examples:

previous build available
database migrations reversible
feature flags available

---

## 6 README Quality Gate

Verify the app README meets the standard in `knowledge/readme-template.md`.

Check all of the following are present in `apps/<project-name>/README.md`:

- One-liner describing what the app does and who it's for
- Numbered user journey (What it does)
- Stack table covering all layers
- All environment variables listed by name
- Schema apply step (what tables are created, where to run)
- `npm run dev` command + what success looks like on first run
- Every HTTP endpoint documented (method, body, response shape)
- Analytics events table (if PostHog is used)
- Key design decisions section

Also verify:

- `.env.local.example` file exists in the app root
- README does not contain the default Next.js boilerplate

Block deployment if README is missing or is the default Next.js template.

---

## 7 Sentry Error Tracking Verification

Verify Sentry is initialized and configured for the app.

Check:

- `@sentry/nextjs` is installed in `package.json`
- `sentry.client.config.ts` and `sentry.server.config.ts` exist in the app root with `Sentry.init()` configured
- `SENTRY_DSN` (or `NEXT_PUBLIC_SENTRY_DSN`) is listed in `.env.local.example`
- `next.config.ts` wraps the config with `withSentryConfig()`
- At least one try/catch block uses `Sentry.captureException(e)` in API routes

If Sentry is not configured, add it as a deployment blocker. Post-deploy debugging without error tracking is blind.

**PM-documented exceptions**: Before failing the gate on empty or missing Sentry-related variables (`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, or similar), read `project-state.md` **Decisions Log** and this cycle’s deploy-check result file (e.g. `experiments/results/deploy-check-NNN.md`). If either records an explicit PM exception that lists those keys as optional for this app or cycle, **do not block** on those keys being unset. The exception must name the variable(s) exempted; vague waivers are not acceptable.

# Added: 2026-04-05 — MoneyMirror Phase 3 (issue-010)

**Minimum setup**:

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

# Added: 2026-03-22 — Sentry verification (error tracking gap)

---

## 8 Automated PR Creation

If all checks pass (Build, Environment, Infrastructure, Monitoring, README, Sentry), create a GitHub pull request.

**Process**:

1. Confirm working tree is clean:
   ```bash
   git status
   ```
2. Commit any uncommitted changes if present (implementation files only, no secrets):
   ```bash
   git add apps/[project]/ experiments/ schema.sql
   git commit -m "feat([project]): complete issue-NNN implementation"
   ```
3. Push branch to remote:
   ```bash
   git push -u origin [current-branch]
   ```
4. Create PR using `gh`:

   ```bash
   gh pr create \
     --title "feat([project]): [one-line description from product spec]" \
     --body "$(cat <<'EOF'
   ## Summary
   - [Bullet 1 from product spec]
   - [Bullet 2 from product spec]
   - [Bullet 3 from product spec]

   ## Issue
   Closes #[issue-number] ([issue title])

   ## Pipeline Stages Completed
   - [x] create-issue
   - [x] explore
   - [x] create-plan
   - [x] execute-plan
   - [x] deslop
   - [x] review
   - [x] peer-review
   - [x] qa-test
   - [x] metric-plan
   - [x] deploy-check

   ## Test Plan
   - [ ] Run `npm test` — all tests pass
   - [x] Schema verified (all tables confirmed present before PR creation)
   - [x] ENV verified (.env.local.example complete, all process.env.* vars accounted for)
   - [ ] Run `npm run dev` and verify user journey

   🤖 Generated with AI Product OS
   EOF
   )"
   ```

5. Return the PR URL in the deploy-check output.

**Block PR creation if**:

- Any deploy-check stage is blocked
- README quality gate fails
- Sentry verification fails

# Added: 2026-03-22 — Automated PR creation (claude-caliper alignment)

---

# Output Format

Return output using this structure.

---

Local Smoke Test (Gate 0 — PM confirmed)

Build Status

Environment Configuration (FILLED / EMPTY / MISSING per var)

Infrastructure Readiness

Monitoring Status

Rollback Plan

README Quality Gate

Sentry Error Tracking

PR Creation

Deployment Decision

Approve Deployment
Block Deployment

---

# Rules

Never approve deployment if critical risks exist.

Prioritize system stability over speed.

---

# Optional: PM Portfolio Output

If this project targets a specific company role (e.g., "PM - Personalisation, Nykaa"), suggest generating PM portfolio materials after all gates pass:

1. **PM-PORTFOLIO-KIT.md** — Generate in the app directory (committed to repo). Include: local testing guide, deployment guide, executive presentation outline, email draft, interview trade-off narratives.
2. **Executive deck outline** — Save to `pm-assets/<company>/deck/` (local only, gitignored). Structure: problem statement, solution, architecture, metrics impact, demo screenshots.
3. **Company context** — Save to `pm-assets/<company>/context.md` (local only). Include: product decisions, business/health/product metrics impact, competitive positioning.

This is optional and only applies when the project is a PM portfolio piece targeting a specific company.
