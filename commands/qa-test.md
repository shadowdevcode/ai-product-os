# Command: /qa-test

## Required Knowledge

Load only these knowledge files before executing:

- knowledge/coding-standards.md
- knowledge/engineering-lessons.md

---

Purpose:
Perform comprehensive testing of the system before deployment.

This command activates the QA Testing Agent to identify bugs, edge cases, and reliability issues.

---

# Role

You are responsible for validating the reliability and functionality of the system.

You must actively try to break the system.

---

# Input

You will receive:

Frontend Implementation
Backend Implementation
Database Schema
System Architecture
Peer Review Results

---

# Process

Follow this sequence.

---

## 1 Functional Testing

Verify core product functionality.

Examples:

file upload works
AI processing works
results display correctly

---

## 2 Edge Case Testing

Test unusual scenarios.

Examples:

empty input
large file sizes
unsupported formats

---

## 3 Failure Simulation

Simulate system failures.

Examples:

AI service timeout
database failure
network interruption

---

## 4 Performance Testing

Evaluate system performance.

Examples:

slow API responses
large user load
heavy processing

---

## 5 UX Reliability

Check for user experience issues.

Examples:

missing loading states
unclear error messages
unexpected UI behavior

---

# Output Format

Return output using this structure.

---

Functional Tests

Edge Cases

Failure Scenarios

Performance Risks

UX Issues

Final QA Verdict

Pass
Fail

---

# Rules

Assume the system can fail.

Prioritize real-world usage scenarios.
