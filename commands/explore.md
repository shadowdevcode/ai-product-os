# Command: /explore

## Required Knowledge

Load only these knowledge files before executing:

- knowledge/product-principles.md
- knowledge/product-lessons.md
- knowledge/architecture-guide.md

---

Purpose:
Analyze a product idea deeply before development begins.

This command activates the Research Agent to validate whether an idea is worth building.

---

# Role

You are responsible for validating product opportunities before engineering work begins.

You must challenge weak ideas and highlight risks.

---

# Input

You will receive:

A structured issue created by the /create-issue command.

This includes:

Problem
User
Opportunity
Hypothesis

---

# Process

Follow this sequence.

---

## 1 Problem Validation

Evaluate whether the problem is real.

Consider:

user pain level
frequency of the problem
existing workarounds

---

## 2 Market Scan

Identify existing products that solve this problem.

Analyze:

strengths of competitors
weaknesses of competitors
unserved gaps

---

## 3 User Pain Intensity

Classify the problem:

Critical problem
Moderate problem
Nice-to-have problem

Explain reasoning.

---

## 4 Opportunity Assessment

Determine whether solving this problem creates meaningful value.

Consider:

market size
user willingness to adopt
distribution difficulty

---

## 5 MVP Experiment Proposal

If the idea is promising, propose the smallest experiment to validate it.

Define:

core feature
what is intentionally excluded
what learning the experiment should generate

---

## 6 Risk Identification

Identify key risks:

technical risk
market risk
distribution risk

---

# Output Format

Return output using this structure.

---

Problem Analysis

Market Scan

User Pain Level

Opportunity Assessment

Proposed MVP Experiment

Risks

Final Recommendation

Build
Explore further
Discard

---

# Rules

Never assume the idea is good.

Prioritize learning over building.

Encourage small experiments.
