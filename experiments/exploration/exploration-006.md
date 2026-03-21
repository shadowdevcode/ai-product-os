# Exploration: Issue-006 — Ozi Reorder Experiment

**Agent**: Research Agent
**Date**: 2026-03-20
**Issue**: issue-006

---

## Problem Analysis

**Is the problem real?**

Yes. The problem is real, specific, and well-scoped.

The issue correctly identifies that dark-store churn in the baby essentials category is not driven by delivery failure — it is driven by absence of re-engagement. The user experience is structured for discovery-first browsing, which is mismatched to the mental model of a parent buying consumables on a predictable cycle.

**Pain signals:**

- Baby essentials (diapers, formula, wipes) are non-substitutable, non-deferrable, and cycle-predictable. A size-3 Pampers purchase today is a near-certain size-3 or size-4 purchase in 18–22 days.
- A parent running out of diapers at 10pm is not making a considered purchasing decision — they are executing an emergency. The competitor who sends a timely reminder owns the considered decision window.
- The current Ozi experience requires the user to initiate: open app, search, add to cart, checkout. For a product category that runs on autopilot in the user's mind, this is 4 steps too many.

**Frequency**: High. Parents of 0–3 year olds reorder baby essentials every 2–4 weeks.

**Existing workarounds**: Competitors. Blinkit and Amazon Subscribe & Save already intercept this need. The current Ozi workaround is the user leaving the app permanently.

**Assessment**: Problem validity — **Confirmed**.

---

## Market Scan

| Competitor | Approach | Strength | Weakness |
|---|---|---|---|
| Blinkit | App notifications + reorder shortcut on order history | High frequency reminders, tight delivery SLA | Generic nudges, not timed to consumption cycle |
| Amazon Subscribe & Save | Subscription-based auto-delivery | Zero friction once set up | Requires upfront commitment; over-serves casual buyers |
| Zepto | Repeat order button in order history | Simple UX | Passive — waits for user to open app |
| Swiggy Instamart | Order history + occasional push nudge | Familiar UX | No prediction logic; nudges are date-based, not cycle-based |
| Firstcry (baby-specific) | Email-based replenishment reminders | Category-aware | Slow delivery SLA; not a dark-store model |

**Unserved gap**: None of the quick-commerce players use consumption-cycle-aware timing for push notifications — they push based on elapsed time since last app open or order recency, not on estimated product depletion. A notification timed to Day 18–20 post-delivery for diapers is qualitatively different from a promotional nudge. Ozi is small enough to instrument this precisely.

---

## User Pain Level

**Classification: Critical problem for Emergency Parent and Routine Replenishment Parent.**

- **Emergency Parent**: Pain is acute and time-sensitive. A Day 18–20 reminder is the only intervention window before the emergency happens. Missing it = guaranteed competitor order.
- **Routine Replenishment Parent**: Pain is moderate but cumulative. Behavioral lock-in risk grows with each missed reminder cycle.
- **First-Time Parent**: Moderate-to-high. The pre-filled cart is a trust signal ("Ozi knows what I need"), not just a convenience feature.

---

## Opportunity Assessment

**Does solving this create meaningful value?**

Yes, on three dimensions:

1. **Revenue retention**: A nudge that lifts 21-day repeat purchase rate by even 10–15% across active users is a material LTV improvement at Ozi's current stage.
2. **Behavioral lock-in**: A parent who receives two or three well-timed reminders begins to associate Ozi with "handles itself." That is a habit. Habits are hard for competitors to displace.
3. **No infrastructure dependency**: This experiment does not require ML, personalization, subscription architecture, or any new data models beyond `order_delivered` event + SKU category tag.

**Market size**: Delhi-NCR dark-store parent cohort. Focused experiment — right size to generate learnable signal without over-building.

**User willingness to adopt**: Very high for Routine Replenishment Parents.

**Distribution difficulty**: None. Retention feature. Users already have Ozi installed.

---

## Proposed MVP Experiment

**Core feature (minimum to test the hypothesis):**

1. A trigger that fires a push notification 18–20 days after `order_delivered` for diaper/essential SKU categories.
2. A deep link from the notification that opens a pre-filled cart with the user's previous order items and quantities.
3. A control group (50% of eligible users) who receive no reminder.
4. 7 instrumented events to measure the funnel end-to-end.

**Intentionally excluded from V1:**
- ML-based timing (use fixed Day 18–20 rule)
- Personalization by sub-segment
- Quantity adjustment in reminder flow
- Subscription opt-in
- A/B testing of notification copy
- Multi-channel (push only)

**What this experiment must answer:**
- Does a timely reminder materially increase 21-day repeat purchase rate vs. control?
- Do users who click the notification complete checkout at a meaningful rate?
- Is Day 18–20 the right trigger window?

**Minimum 7 instrumented events:**
1. `reminder_triggered` — notification sent (user_id, order_id, sku_category, trigger_day)
2. `reminder_delivered` — push received
3. `reminder_opened` — notification tapped
4. `cart_prefilled` — deep link resolved, cart loaded
5. `checkout_started`
6. `order_placed` — conversion
7. `control_order_placed` — organic conversion in control group

---

## Risks

**Technical Risk: Medium**
- Push notification infrastructure may not support event-triggered firing based on `order_delivered` + N-day delay without backend work.
- Pre-filled cart requires either cart persistence API or URL scheme encoding order items. May not exist yet.
- **Mitigation**: Scope discovery call with Ozi engineering to confirm push infra, SKU category tagging, and pre-filled cart deep link feasibility before committing to sprint scope.

**Market Risk: Low**
- Parents are high-intent repeat buyers by necessity. A well-timed reminder for a genuinely needed product will feel useful, not intrusive.
- **Mitigation**: Use Day 18–20 as conservative starting point. Instrument timing data to refine.

**Distribution Risk: Low**
- Retention feature. No new acquisition cost.
- **Caveat**: If push notification opt-in rates are low, reachable cohort shrinks. Validate opt-in rate before setting sample size targets.

**Execution Risk: Medium**
- Clean A/B control group requires feature flag or experiment framework. If none exists, use user_id modulo 2 for cohort split.

---

## Final Recommendation

**Build.**

The problem is real, the pain level is critical for the primary cohort, the competitive gap is real and time-limited, and the intervention is technically simple relative to its potential impact.

**Before writing the plan, resolve two factual questions:**
1. Does Ozi's stack support event-triggered push notifications (order_delivered + N-day delay)? Or is custom cron + notification API required?
2. Is there an existing deep link scheme or API endpoint for cart pre-population from order history?

These two answers determine whether the MVP is a 1-sprint or 2-sprint build.
