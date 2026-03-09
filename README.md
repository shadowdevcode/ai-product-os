# AI Product Operating System (OS)

Welcome to the **AI Product OS**, a simulated, end-to-end product development organization where specialized AI agents collaborate to build products from idea to production.

This repository orchestrates a team of specialized agents representing different roles in a typical tech company. The human Product Manager acts as the orchestrator, directing the workflow through structured commands.

---

## 🚀 Key Concepts

*   **Specialized Agents**: Each agent represents a specific role (e.g., Research Agent, Frontend Engineer, QA Agent, Backend Architect). Agents are constrained to their specific responsibilities.
*   **Command-Driven Workflow**: The development lifecycle is executed sequentially using structured `/commands` (e.g., `/create-issue`, `/execute-plan`, `/qa-test`).
*   **Strict Quality Gates**: Progression to the next development stage is enforced by quality gates. The pipeline will block if a stage (like Peer Review or QA) fails.
*   **Live State Management**: The system's runtime memory is maintained in `project-state.md`, tracking the active project, current stage, quality gate status, blockers, and architectural decisions.
*   **Continuous Learning**: After every project cycle, postmortems are generated and converted into durable system intelligence, updating the shared knowledge base (`product-lessons.md`, `engineering-lessons.md`, `prompt-library.md`).

---

## 📂 Repository Structure

*   **/agents**: Contains instructions, roles, and responsibilities for each specialized agent.
*   **/commands**: Defines the executable workflow commands and their execution rules.
*   **/knowledge**: The central brain. Contains architectural guides, coding standards, UI standards, product principles, and historical lessons learned.
*   **/experiments**: Active workspace for tracking ideas, problem exploration, product plans, and testing results.
*   **/apps** / **/src**: Where the actual implementations (codebases) are generated and stored.
*   **/postmortems**: Archival folder for post-launch analysis before insights are extracted into `/knowledge`.
*   `system-orchestrator.md`: Rules for stage progression, quality gates, and agent handoffs.
*   `command-protocol.md`: The execution framework outlining how commands load context and update state.
*   `project-state.md`: The dynamic, live memory of the system.

---

## 🔄 The 12-Step Product Workflow

The OS enforces a rigorous 12-step pipeline. Commands must be executed sequentially unless overridden by the human PM.

1.  **Idea Incubation**: `/create-issue` - Convert a raw idea into a structured opportunity (Research Agent).
2.  **Exploration**: `/explore` - Validate the problem and analyze market feasibility (Research Agent).
3.  **Planning**: `/create-plan` - Specs, UX design, System Architecture, Database Schema (Product, Design, DB, & Backend Architects).
4.  **Execution**: `/execute-plan` - Write the code for frontend and backend (Frontend & Backend Engineers).
5.  **Deslop**: `/deslop` - Clean and polish AI-generated code, remove complexity (Deslop Agent).
6.  **Code Review**: `/review` - Baseline implementation review (Code Review Agent).
7.  **Peer Review**: `/peer-review` - Adversarial, deep architectural and scalability review (Peer Review Agent).
8.  **QA Testing**: `/qa-test` - Emulated reliability and integration testing (QA Agent).
9.  **Metric Planning**: `/metric-plan` - Define tracking, funnels, and success criteria (Analytics Agent).
10. **Deployment Check**: `/deploy-check` - Final production readiness verification (Deploy Agent).
11. **Postmortem**: `/postmortem` - Analyze performance, bugs, and workflow bottlenecks (Learning Agent).
12. **Learning**: `/learning` - Bake insights into the durable knowledge base, concluding the cycle (Learning Agent).

---

## 🧑‍💻 The Human Product Manager Role

While the agents handle the heavy lifting, **the human PM is ultimately responsible for**:
*   Deciding which ideas to pursue.
*   Evaluating agent outputs at each stage.
*   Overriding blocked quality gates if necessary.
*   Making final product and architectural decisions.
*   Approving releases.

*Agents assist execution but do not replace human judgment.*

---

## 🏁 Getting Started

To operate the AI Product OS:

1.  Check `project-state.md` to understand the current active project and stage.
2.  Run the appropriate next command from the 12-step workflow by passing the workflow instructions found in `/commands/<command>.md` to the active AI agent.
3.  Review the generated artifacts and ensure `project-state.md` is correctly updated according to the command protocol.
4.  Proceed to the next stage only when Quality Gates pass!

*Build faster, learn systematically, fail safely!*
