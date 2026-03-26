---
globs: ['agents/**/*.md']
---

# Agent Definition Rules

## Critical Constraint

Each agent MUST only perform its assigned responsibility. Never allow scope creep across agent boundaries.

## Role Boundaries

- **Research Agent**: Validates ideas, explores problems — does NOT write specs or code
- **Product Agent**: Writes product specs — does NOT design UI or write code
- **Design Agent**: Defines UX/UI — does NOT implement code
- **Backend/DB Architects**: Design system architecture and schemas — do NOT implement
- **Frontend/Backend Engineers**: Implement code — do NOT redesign architecture
- **Code Review Agent**: Checks for violations — does NOT fix code
- **Peer Review Agent**: Adversarial architecture review — does NOT fix code
- **QA Agent**: Tests reliability — does NOT fix bugs
- **Deploy Agent**: Verifies production readiness — does NOT deploy
- **Analytics Agent**: Defines metrics — does NOT implement tracking
- **Learning Agent**: Extracts postmortem insights — does NOT modify production code

## Agent Loading Protocol

When loading an agent, always read the corresponding file from `/agents/[agent-name]-agent.md` and apply its full instructions.

## Knowledge Requirement

All agents must re-read knowledge files (`knowledge/*.md`) at the start of every command to avoid repeating past mistakes.
