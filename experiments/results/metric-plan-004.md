# Metric Plan: Project Clarity

**Date:** 2026-03-11
**Stage:** Metric Planning
**Hypothesis:** If we build a to-do list tailored for PMs and auto-categorize tasks, we will reduce time spent organizing work and ensure high-leverage work is completed.

---

## North Star Metric
**Active Habit Builders (Weekly Categorized Tasks per User)**
*Why:* If PMs are successfully dumping raw thoughts and relying on the AI to organize them throughout the week, it proves the core hypothesis—the tool is actively reducing their cognitive load of manual organization.

## Supporting Metrics
1. **AI Override Rate:** Percentage of times a user manually changes the AI's categorization. (Measures AI accuracy and trust. Lower is better, ideally $<10\%$).
2. **Task Completion Velocity:** Time from `task_created` to `task_completed`. (Measures if the categorization actually helps them *do* the work instead of just hoarding lists).
3. **Session Brain-Dump Ratio:** Average number of tasks created per session. (PMs usually have bursts of thoughts; this measures ease of rapid entry).

---

## Event Tracking Plan

| Event Name | Trigger Condition | Properties |
| :--- | :--- | :--- |
| `page_viewed` | User loads the web app. | `url`, `referrer` |
| `task_submitted` | User hits Enter in the Brain Dump input. | `input_length`, `time_to_submit` |
| `task_categorized` | AI successfully returns JSON and DB row is created. | `category`, `priority`, `ai_latency_ms`, `task_id` |
| `ai_fallback_triggered` | The API catches a Gemini error/timeout and saves the task safely. | `error_type`, `input_length` |
| `task_completed` | User clicks the checkmark. | `task_id`, `category`, `time_since_creation` |
| `category_overridden` | (Future) User manually changes the lane. | `old_category`, `new_category`, `task_id` |

---

## Funnel Definition
**The "Unburden" Funnel**
Measures the core loop from having a thought to getting it out of their head and checked off.

1. **Visit** (`page_viewed`)
2. **Dump Thought** (`task_submitted`)
3. **Get Organized** (`task_categorized`)
4. **Achieve** (`task_completed`)

*Key Drop-off to watch: `task_categorized` -> `task_completed`. If PMs dump tasks but never complete them, it's just a graveyard.*

---

## Success Thresholds
- **North Star Target:** 15 Categorized Tasks / Active User / Week.
- **AI Override Alert:** Trigger investigation if `category_overridden` exceeds 15% of total `task_categorized` events.
- **Latency Alert:** Trigger investigation if `ai_latency_ms` averages $> 2500ms$ (kills the magic of instant organization).
- **Fallback Alert:** If `ai_fallback_triggered` $> 2\%$ of requests, Gemeni prompt or connection is failing systemically.

---

## Implementation Notes
- **Tooling:** PostHog (Standard for AI Product OS telemetry).
- **Frontend Tracking:** Install `posthog-js` for `page_viewed`, `task_submitted`, and `task_completed`.
- **Backend Tracking:** Use `posthog-node` inside `/api/tasks` to precisely track `task_categorized`, `ai_latency_ms`, and `ai_fallback_triggered` securely without client manipulation.
