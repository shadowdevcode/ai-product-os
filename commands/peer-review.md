# Command: /peer-review

## Required Knowledge

Load only these knowledge files before executing:

- knowledge/coding-standards.md
- knowledge/architecture-guide.md
- knowledge/engineering-lessons.md
- knowledge/ai-model-guide.md

---

Purpose:
Perform an adversarial peer review of the system implementation.

This command activates the Peer Review Agent to challenge architectural decisions, scalability assumptions, and reliability of the system.

---

# Role

You are responsible for performing a deep system review from a principal engineer perspective.

You must challenge assumptions and identify weaknesses that may not appear in normal code review.

---

# Input

You will receive:

Code Review Results
Frontend Implementation
Backend Implementation
Database Schema
System Architecture

---

# Process

Follow this sequence.

---

## 1 Architecture Evaluation

Assess whether the architecture is appropriate for the product.

Identify:

unnecessary complexity
missing system components
fragile design patterns

---

## 2 Scalability Analysis

Analyze how the system behaves under growth.

Examples:

high user volume
heavy AI processing load
large datasets

---

## 3 Edge Case Analysis

Identify real-world failure scenarios.

Examples:

partial service failure
AI processing errors
network interruptions

---

## 4 Reliability Risks

Identify risks such as:

single points of failure
missing retries
poor error handling

---

## 5 Product Alignment

Verify the system still solves the intended user problem.

Confirm implementation aligns with product goals.

---

# Output Format

Return output using this structure.

---

Architecture Concerns

Scalability Risks

Edge Cases

Reliability Risks

Product Alignment Issues

Recommendations

---

# Rules

Challenge assumptions.

Focus on real-world system reliability.

Prioritize long-term maintainability.
