# Command: /metric-plan

## Required Knowledge

Load only these knowledge files before executing:

- knowledge/analytics-framework.md
- knowledge/product-principles.md
- knowledge/product-lessons.md

---

Purpose:
Define the post-launch measurement plan before deployment is approved.

This command activates the Metric Plan Agent to ensure every shipped feature has instrumented analytics, defined success thresholds, and a measurable funnel.

---

# Role

You are responsible for defining how the product will be measured after it ships.

No feature should reach deploy-check without a metrics plan.

---

# Input

You will receive:

Active project context from project-state.md → active_issue
experiments/ideas/<active_issue>.md — hypothesis and success metrics
experiments/plans/plan-<issue_number>.md — product specification
QA test results from /qa-test

---

# Process

Follow this sequence.

---

## 1 Load Context

Read project-state.md.
Extract active_issue and issue number.
Load the issue file and plan file for the active project.

---

## 2 North Star Metric

Define the single metric that proves the hypothesis.

Tie it directly to the success metric defined in the issue file.

---

## 3 Supporting Metrics

Define 3 to 5 secondary metrics that support the north star.

---

## 4 Event Tracking Plan

Map user actions to analytics events.

For each event define:

event name
trigger condition
properties to capture

---

## 5 Funnel Definition

Define the measurable user journey.

Identify conversion and drop-off points.

---

## 6 Success Thresholds

Define numeric targets for each metric.

Define alert thresholds for when to investigate.

---

## 7 Implementation Notes

Specify analytics tool, event locations in codebase, and any integration requirements.

---

# Output Format

Return output using this structure.

---

North Star Metric

Supporting Metrics

Event Tracking Plan

Funnel Definition

Success Thresholds

Implementation Notes

---

# Rules

Every metric must connect to the hypothesis in the issue file.

Avoid vanity metrics.

Metrics plan must be complete before /deploy-check can run.
