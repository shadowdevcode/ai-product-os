# Prompt Library

This document stores reusable prompt patterns discovered through postmortems and experiments.

Agents should consult this file before generating outputs.

---

# Product Planning Prompts

## PRD generation template

When creating a product specification use this structure:

Problem
User
Opportunity
Success Metric
Constraints
MVP Scope

---

# Architecture Prompts

## System design prompt

When designing backend architecture always include:

system components
data flow
API structure
database schema
scaling considerations

---

# Code Generation Prompts

## Implementation rules

When generating implementation code:

follow coding-standards.md
avoid unnecessary abstraction
write readable functions
add comments explaining logic

---

# Review Prompts

## Code review checklist

When reviewing code check:

logic correctness
performance
security
maintainability

---

# Postmortem Learnings

Append system learnings here.

Format:

date
issue
root cause
system improvement

---

## 2026-03-07 — issue-002: Gmail Summary to WhatsApp Notifier

issue: Three systemic failures — unbounded pagination, missing telemetry, and synchronous batch cron
root cause: Architecture plans lacked explicit constraints on data fetching, fan-out patterns for cron jobs, and upfront telemetry requirements
system improvement:
- All data sync loops must declare page limit and date bound before any other logic
- All cron jobs that process N users must use a fan-out trigger pattern — master cron dispatches, never processes
- Telemetry events must be defined in the plan and implemented during feature build, not added post-QA
- Error handling for third-party APIs must classify errors before acting on them — transient vs permanent
- Database schema existence must be verified in deploy-check before any build validation begins
- Data pipelines must implement dead-letter tracking or failure limits per item to prevent poison-pill infinite loops
- Automated fallback/error notifications to users must include strict frequency caps to prevent spam during outages
