# Command: /deploy-check

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

# Output Format

Return output using this structure.

---

Build Status

Environment Configuration

Infrastructure Readiness

Monitoring Status

Rollback Plan

README Quality Gate

Deployment Decision

Approve Deployment
Block Deployment

---

# Rules

Never approve deployment if critical risks exist.

Prioritize system stability over speed.
