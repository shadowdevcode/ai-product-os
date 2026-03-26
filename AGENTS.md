# AGENTS.md

Progressive disclosure index for all specialized agents in the AI Product OS.

Each agent has a dedicated definition file in `/agents/` with full role instructions, responsibilities, and constraints.

---

## Pipeline Agents

| Agent              | Role                                                         | Definition                                                        |
| ------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| Research           | Validates ideas, explores problems and market feasibility    | [research-agent.md](agents/research-agent.md)                     |
| Product            | Converts validated ideas into clear product specifications   | [product-agent.md](agents/product-agent.md)                       |
| Design             | Defines UX structure before engineering work begins          | [design-agent.md](agents/design-agent.md)                         |
| Backend Architect  | Designs technical system architecture before implementation  | [backend-architect-agent.md](agents/backend-architect-agent.md)   |
| Database Architect | Designs data model before backend implementation             | [database-architect-agent.md](agents/database-architect-agent.md) |
| Frontend Engineer  | Implements user interface based on design specification      | [frontend-engineer-agent.md](agents/frontend-engineer-agent.md)   |
| Backend Engineer   | Implements backend services based on architecture and schema | [backend-engineer-agent.md](agents/backend-engineer-agent.md)     |
| Deslop             | Cleans and polishes AI-generated code before code review     | [deslop-agent.md](agents/deslop-agent.md)                         |
| Code Review        | Reviews code for violations before acceptance                | [code-review-agent.md](agents/code-review-agent.md)               |
| Peer Review        | Performs adversarial architecture review of implementation   | [peer-review-agent.md](agents/peer-review-agent.md)               |
| QA Testing         | Validates system reliability before release                  | [qa-agent.md](agents/qa-agent.md)                                 |
| Metric Plan        | Defines measurement plan before product ships                | [metric-plan-agent.md](agents/metric-plan-agent.md)               |
| Deploy             | Ensures system is safe to deploy to production               | [deploy-agent.md](agents/deploy-agent.md)                         |
| Analytics          | Defines how product usage will be measured                   | [analytics-agent.md](agents/analytics-agent.md)                   |
| Learning           | Improves the system after each iteration via postmortems     | [learning-agent.md](agents/learning-agent.md)                     |

## Utility Agents

| Agent         | Role                                                | Definition                            |
| ------------- | --------------------------------------------------- | ------------------------------------- |
| Documentation | Maintains clear documentation (CODEBASE-CONTEXT.md) | [docs-agent.md](agents/docs-agent.md) |

---

## Agent Activation Rule

Agents are activated by their corresponding command. Never activate an agent outside its designated pipeline stage. See [CLAUDE.md](CLAUDE.md) for the command-to-agent mapping.
