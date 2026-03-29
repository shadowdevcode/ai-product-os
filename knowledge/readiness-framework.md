# Readiness Framework

Self-assessment framework for the AI Product OS. Measures system maturity across 5 pillars.

Loaded only by `/eval` and `/learning` commands. Not loaded during other pipeline stages.

Inspired by Harness Engineering's 8-pillar readiness model, simplified for solo PM use.

---

## 5 Pillars

### 1. Pipeline Compliance

Are all 12 stages being used? Are quality gates enforced?

| Level          | Criteria                                      |
| -------------- | --------------------------------------------- |
| 1 - Bare       | Some stages skipped regularly                 |
| 2 - Guided     | All stages run, gates checked manually        |
| 3 - Enforced   | Gates block progress mechanically (hooks)     |
| 4 - Measured   | Gate pass/fail rates tracked per cycle        |
| 5 - Autonomous | Gates auto-adjust based on project risk level |

### 2. Knowledge Currency

Are knowledge files updated after each cycle? Is the learning loop functional?

| Level          | Criteria                                                       |
| -------------- | -------------------------------------------------------------- |
| 1 - Bare       | Knowledge files unchanged since initial setup                  |
| 2 - Guided     | Lessons added after most cycles                                |
| 3 - Enforced   | /postmortem + /learning run every cycle, agent files updated   |
| 4 - Measured   | Lesson count tracked, agent improvements verified via /eval    |
| 5 - Autonomous | Auto-markers regenerate CLAUDE.md from lessons on every commit |

### 3. Enforcement Coverage

What percentage of known anti-patterns have automated checks vs. prose-only?

| Level          | Criteria                                                        |
| -------------- | --------------------------------------------------------------- |
| 1 - Bare       | All enforcement is prose in CLAUDE.md                           |
| 2 - Guided     | Pre-commit hooks catch secrets and file sizes                   |
| 3 - Enforced   | Anti-pattern grep checker + function size hooks active          |
| 4 - Measured   | Each postmortem pattern maps to a specific check script         |
| 5 - Autonomous | New patterns auto-extracted from postmortems into check scripts |

### 4. Token Efficiency

Are commands loading only relevant knowledge? Is context managed?

| Level          | Criteria                                                   |
| -------------- | ---------------------------------------------------------- |
| 1 - Bare       | All 9 knowledge files loaded for every command             |
| 2 - Guided     | Required Knowledge sections exist per command              |
| 3 - Enforced   | /compact guidance followed; model routing reminders active |
| 4 - Measured   | Token usage tracked per command type                       |
| 5 - Autonomous | Subagent model tiers applied (Haiku/Sonnet/Opus)           |

### 5. Cycle Velocity

How many pipeline stages complete per session? Where does the pipeline stall?

| Level          | Criteria                                                   |
| -------------- | ---------------------------------------------------------- |
| 1 - Bare       | Pipeline rarely completes a full cycle                     |
| 2 - Guided     | Full cycles complete but with manual intervention          |
| 3 - Enforced   | Cycles complete with minimal blocked states                |
| 4 - Measured   | Stage durations tracked, bottlenecks identified            |
| 5 - Autonomous | Atomic task decomposition + parallel execution operational |

---

## Maturity Levels

| Level | Name           | Definition                                                                   |
| ----- | -------------- | ---------------------------------------------------------------------------- |
| 1     | **Bare**       | Pipeline exists as prose; no automation                                      |
| 2     | **Guided**     | Knowledge subsetting, model routing docs, manual gates                       |
| 3     | **Enforced**   | Hooks active, gates mechanical, anti-pattern checks running                  |
| 4     | **Measured**   | Readiness scoring active, postmortem trends tracked, eval assertions passing |
| 5     | **Autonomous** | Auto-markers synced, self-improving prompts, subagent tiers operational      |

---

## How to Score

During `/eval` or `/learning`, assess each pillar 1-5 and calculate:

**Overall Score** = Average of 5 pillar scores

| Range     | Rating     |
| --------- | ---------- |
| 4.5 - 5.0 | Autonomous |
| 3.5 - 4.4 | Measured   |
| 2.5 - 3.4 | Enforced   |
| 1.5 - 2.4 | Guided     |
| 1.0 - 1.4 | Bare       |

# Added: 2026-03-29 — Readiness framework (Harness Engineering alignment)
