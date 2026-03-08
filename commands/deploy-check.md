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

# Output Format

Return output using this structure.

---

Build Status

Environment Configuration

Infrastructure Readiness

Monitoring Status

Rollback Plan

Deployment Decision

Approve Deployment
Block Deployment

---

# Rules

Never approve deployment if critical risks exist.

Prioritize system stability over speed.
