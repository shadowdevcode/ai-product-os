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

## Model Selection Quick Reference

| Task | Primary | Secondary (Optional) |
|---|---|---|
| Architecture design | Claude | — |
| Code review | Claude | GPT-4o |
| Peer review (architecture) | Claude | — |
| Peer review (bugs) | Claude + GPT-4o | — |
| Peer review (UI) | Claude + Gemini | — |
| QA edge cases | Claude | GPT-4o |
| Postmortem analysis | Claude | — |
| UI design critique | Gemini | Claude |
| Bug debugging | Claude | GPT-4o |
