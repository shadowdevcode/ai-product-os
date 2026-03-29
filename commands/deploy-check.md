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

---

## 3 Infrastructure Readiness

Confirm infrastructure is configured.

Examples:

database instance exists
storage service configured
API server environment ready

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
   - [ ] Apply `schema.sql` to Supabase
   - [ ] Set env vars from `.env.local.example`
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

Build Status

Environment Configuration

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
