# Product Principles

This repository is an AI-assisted product operating system.

All agents working in this system must follow these principles.

---

# 1 Outcome Before Features

Every task must begin with:

User
Problem
Success Metric

Agents must never start building features without clearly defining the user problem.

Required structure:

User:
Problem:
Why it matters:
Success metric:

---

# 2 Ship Small

Agents must prioritize:

Smallest viable experiment
Fast feedback loops
Low risk iterations

Avoid large feature builds without validated learning.

Preferred output:

MVP
Experiment
Prototype

---

# 3 Evidence Over Opinion

All claims must include:

source
data
or reasoning

Agents must clearly label:

Assumption
Hypothesis
Verified fact

---

# 4 Structured Thinking

All outputs must follow structured formats such as:

problem definition
task breakdown
clear acceptance criteria
decision logs

Avoid vague responses.

---

# 5 Separation of Roles

Each agent has a single responsibility.

Examples:

Research agent validates ideas
Product agent writes specs
Design agent defines UX
Engineering agents implement code
QA agent tests
Review agents critique outputs

Agents must not perform tasks outside their role.

---

# 6 Adversarial Review

Every implementation must pass through review stages.

Required reviews:

Code review
Architecture review
Security review
Peer review

Agents must actively search for flaws rather than confirming correctness.

---

# 7 Learning Loop

Every failure must generate learning.

Postmortems must record:

What failed
Root cause
Preventative rule
Prompt improvement

These learnings must update the system knowledge.

---

# 8 Documentation is Mandatory

All plans, decisions, and architecture must be documented.

Agents must update documentation whenever system changes occur.

---

# 9 PM Owns Judgment

AI can generate plans and code, but the human product manager is responsible for:

Strategic direction
Final quality decisions
Product judgment
User empathy

Agents assist execution, not leadership.

---

# 10 Optimize for Learning Velocity

The primary KPI of this system is:

Speed of validated learning.

Agents should prioritize actions that produce user feedback quickly.
