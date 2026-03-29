# AI Model Routing Guide

This file defines which AI models to use for which tasks within the AI Product OS pipeline.

Inspired by Zevi Arnovitz's multi-model team methodology: treat each model as a specialist with distinct strengths and use Claude as the lead architect who adjudicates all output.

---

## The AI Team

### Claude — CTO / Architect / Review Lead

**Strengths**: Architecture, planning, logic, code review, adversarial reasoning, long-context understanding, willingness to push back.

**Use for**:

- `/explore` — Problem validation and market feasibility
- `/create-plan` — Product spec, architecture design, database schema
- `/review` — Code review (primary)
- `/peer-review` — Architecture review lead and adjudicator of all model feedback
- `/postmortem` — Root cause analysis and systemic improvements
- `/learning` — Knowledge extraction and agent file updates
- All commands that require judgment, synthesis, or decision-making

**Why**: Claude is communicative, opinionated, and willing to challenge. It is the model most likely to push back on bad ideas rather than agree to be agreeable.

---

### GPT-4o / Codex — Bug Fixer / Edge Case Hunter

**Strengths**: Precise bug identification, gnarly implementation issues, edge case enumeration, quiet and surgical.

**Use for**:

- Secondary perspective in `/peer-review` (bug-level analysis)
- Secondary perspective in `/qa-test` (edge case generation)
- Debugging sessions when Claude's fix doesn't work

**Why**: GPT-4o is excellent at finding implementation-level bugs and communicates minimally. Call it when something is specifically broken and you need a different eye on the code, not a debate.

**How to use in peer-review**:

> Paste the implementation into GPT-4o with this prompt: "You are a senior engineer doing code review. Find every bug, edge case, and implementation risk in this code. Be specific and terse. Do not approve — only critique."
> Then bring GPT-4o's output to Claude and ask: "Evaluate these findings. Which are valid? Which are wrong? What do I actually need to fix?"

---

### Gemini — UI / Creative Designer

**Strengths**: Visual design critique, UI/UX alternatives, creative suggestions, aesthetic judgment.

**Use for**:

- Secondary perspective in `/peer-review` (UI/UX critique)
- Design alternatives during `/create-plan` (design spec)
- Quick visual iteration ideas

**Why**: Gemini is artistically talented at interface work but requires careful management — it can go off-script or suggest changes that break the existing design system. Use for inspiration and critique, not for direct implementation.

**How to use in peer-review**:

> Paste screenshots or component code into Gemini with: "You are a senior product designer. Critique this UI for usability, clarity, and visual hierarchy. What would you change and why?"
> Then bring findings to Claude for adjudication.

---

## Multi-Model Peer Review Protocol

The `/peer-review` command should ideally use all three models. Here is the sequence:

1. **Claude** runs the full adversarial architecture review (Challenge Mode)
2. **GPT-4o** reviews the implementation for bugs and edge cases (optional, use when available)
3. **Gemini** reviews the UI for UX and design quality (optional, use when available)
4. **Claude** reads all three outputs and adjudicates:
   - Accept findings that are valid and actionable
   - Reject findings that are wrong, redundant, or low-priority
   - Synthesize a final Recommended Improvements list

**Rule**: Claude never blindly applies GPT or Gemini suggestions. It evaluates them.

---

## Anti-Sycophancy Principle (Applies to All Models)

Every model defaults toward agreement. Fight this by design.

**For Claude**: Explicitly instruct it to challenge before approving. Use Challenge Mode from peer-review-agent.md. Give it permission to disagree.

**For GPT-4o**: Frame prompts as critique-only tasks. Never ask "Is this good?" Always ask "What is wrong with this?"

**For Gemini**: Set scope explicitly. If you want UI critique, say exactly that. Without constraints, it may suggest full redesigns when you only need a button label changed.

---

## Single-Model Mode (Default)

If only Claude is available (standard Claude Code session), run the full pipeline as normal. The multi-model protocol is an enhancement, not a requirement.

When running single-model:

- Peer Review Agent runs Challenge Mode with three perspective stances (reliability, adversarial user, future maintainer)
- This simulates multi-perspective review within a single model session

---

## Multi-Model Routing by Pipeline Stage (Zevi Arnovitz Alignment)

Inspired by Zevi's methodology: route each stage to the model best suited for that task type. Claude leads strategy and review; Gemini executes UI; Claude Opus handles adversarial depth.

> **Routing Rule (TL;DR):** Use **Claude Sonnet 4.6** for planning and strategy stages
> (`/create-issue`, `/explore`, `/create-plan`, `/review`). Use **Gemini 2.5 Flash** for
> UI/frontend execution (`/execute-plan` frontend tasks). Use **Claude Opus 4.6** for
> adversarial depth (`/peer-review`). Default to Sonnet when in doubt.

| Pipeline Stage                | Recommended Model | Model ID            | Rationale                                 |
| ----------------------------- | ----------------- | ------------------- | ----------------------------------------- |
| `/create-issue`               | Claude Sonnet     | `claude-sonnet-4-6` | Strategic framing, problem articulation   |
| `/explore`                    | Claude Sonnet     | `claude-sonnet-4-6` | Market reasoning, feasibility judgment    |
| `/create-plan`                | Claude Sonnet     | `claude-sonnet-4-6` | Architecture design, spec synthesis       |
| `/execute-plan` (backend)     | Claude Sonnet     | `claude-sonnet-4-6` | Logic-heavy implementation                |
| `/execute-plan` (frontend/UI) | Gemini 2.5 Flash  | `gemini-2.5-flash`  | UI execution speed, visual accuracy       |
| `/deslop`                     | Claude Sonnet     | `claude-sonnet-4-6` | Code cleanup and pattern recognition      |
| `/review`                     | Claude Sonnet     | `claude-sonnet-4-6` | Code review, standards enforcement        |
| `/peer-review`                | Claude Opus       | `claude-opus-4-6`   | Adversarial depth, will push back hardest |
| `/qa-test`                    | Claude Sonnet     | `claude-sonnet-4-6` | Edge case enumeration                     |
| `/metric-plan`                | Claude Sonnet     | `claude-sonnet-4-6` | Analytics strategy                        |
| `/deploy-check`               | Claude Sonnet     | `claude-sonnet-4-6` | Production readiness judgment             |
| `/postmortem`                 | Claude Opus       | `claude-opus-4-6`   | Root cause synthesis, systemic insight    |
| `/learning`                   | Claude Sonnet     | `claude-sonnet-4-6` | Knowledge extraction and distillation     |

**Rule**: Default to Sonnet for throughput. Escalate to Opus when adversarial depth matters most (peer-review, postmortem). Use Gemini Flash for frontend-only execution tasks to maximize UI iteration speed.

**In a single-model session**: All stages run with whatever model is active. The routing table above applies when you have the ability to select models per task.

# Added: 2026-03-22 — Specific model IDs and stage routing (Zevi alignment)

---

## Model Selection Quick Reference

| Task                       | Primary                | Primary Model ID    | Secondary (Optional) |
| -------------------------- | ---------------------- | ------------------- | -------------------- |
| Architecture design        | Claude Sonnet          | `claude-sonnet-4-6` | —                    |
| Code review                | Claude Sonnet          | `claude-sonnet-4-6` | GPT-4o               |
| Peer review (architecture) | Claude Opus            | `claude-opus-4-6`   | —                    |
| Peer review (bugs)         | Claude Opus + GPT-4o   | `claude-opus-4-6`   | —                    |
| Peer review (UI)           | Claude Sonnet + Gemini | `claude-sonnet-4-6` | —                    |
| QA edge cases              | Claude Sonnet          | `claude-sonnet-4-6` | GPT-4o               |
| Postmortem analysis        | Claude Opus            | `claude-opus-4-6`   | —                    |
| UI design critique         | Gemini 2.5 Flash       | `gemini-2.5-flash`  | Claude               |
| Bug debugging              | Claude Sonnet          | `claude-sonnet-4-6` | GPT-4o               |

---

## Subagent Cost Tiers

When Claude Code spawns subagents (via Agent tool or parallel sessions), use the cheapest model sufficient for the task:

| Task Type                                                                | Model  | Rationale                                                 |
| ------------------------------------------------------------------------ | ------ | --------------------------------------------------------- |
| **Exploration** (reading files, searching code, understanding structure) | Haiku  | 80% cheaper than Sonnet, sufficient for context gathering |
| **Implementation** (writing code, running tests)                         | Sonnet | Default — fast and reliable for coding tasks              |
| **Adversarial review** (finding flaws, challenging architecture)         | Opus   | Reserve for high-stakes analysis where depth matters      |

Use `model: "haiku"` parameter when spawning Explore-type subagents. Use `model: "opus"` only for review/architecture subagents.

---

## Multi-Model Workflow in Claude Code

Claude Code natively supports Anthropic models only (Opus, Sonnet, Haiku). For multi-model peer review with GPT/Gemini:

**Current approach** (manual protocol — same as what Zevi does in Cursor):

1. Copy implementation code into GPT/Gemini separately
2. Ask for critique-only review (never "Is this good?", always "What is wrong?")
3. Bring findings back to Claude for adjudication
4. Claude decides which findings are valid and which to dismiss

**Future option** (when seamless multi-model is needed):

- PAL MCP Server (github.com/BeehiveInnovations/pal-mcp-server) connects Claude Code to 50+ models
- Only add this when you actually need it — each MCP consumes ~14K tokens of context

**Platform comparison** (for reference):

- **Cursor**: Native model switching (Claude, GPT, Gemini, Codex in a dropdown). This is how Zevi Arnovitz routes models — no MCPs needed.
- **Antigravity** (Google): Agent-first IDE with Gemini 3.1 Pro + Claude + GPT support. Free preview.
- **Claude Code**: Deepest Anthropic integration. Your 12-step pipeline, agents, hooks, and learning loop are built here. Migration cost is high.

# Added: 2026-03-29 — Subagent cost tiers, multi-model guidance, platform comparison
