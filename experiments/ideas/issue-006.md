# Issue-006: Ozi Reorder Experiment — Improving Repeat Purchase for Baby Essentials in a Dark-Store Model

## Problem Statement

Parents using Ozi for diapers and baby essentials frequently reorder from competitors — Blinkit, Zepto, Amazon — not because Ozi's delivery is worse, but because the app offers no timely nudge and no friction-free path back to a previous order. The current experience is structured like a marketplace: browse, search, add to cart. For essentials that run out on a predictable cycle, this is the wrong mental model. There is no signal to the user that it might be time to reorder, and no shortcut to do so. The result is a silent churn event that looks like inactivity but is actually a competitor conversion.

---

## Target User

**Parents of 0–3 year olds in Delhi-NCR** who have placed at least one order for baby essentials on Ozi.

Three distinct sub-segments with different motivations:

- **Emergency Parent** — Ran out of diapers at 10pm. Values speed above everything. Chose Ozi once because of the 52-minute delivery promise. Will choose whoever is fastest next time unless Ozi intervenes before the emergency happens.
- **Routine Replenishment Parent** — Buys monthly. Knows what they need but forgets to reorder until they're almost out. Low brand loyalty; high convenience loyalty. Currently forming habits — Ozi can capture this or lose it to a competitor.
- **First-Time Parent** — Less confident about sizes, brands, and quantities. Needs trust signals. Wants to feel guided, not browsing a catalogue.

---

## Why This Problem Matters

Dark-store unit economics only work when customers repeat. The CAC of acquiring a parent user — whether through referral, discounts, or brand marketing — does not pay off on a single order. At 4–5 stores and an early-stage user base, Ozi is in the window where repeat behavior either becomes a habit or doesn't. Once a parent settles into a weekly Blinkit rhythm for essentials, they are extremely hard to dislodge.

The cost of losing the reorder is not just one missed order. It is the LTV of a high-frequency buyer who was never retained.

Additionally, baby care essentials have a predictable consumption cycle. Diapers, formula, wet wipes, and baby wash are not impulse purchases — they are scheduled. This makes them ideal candidates for a reminder-and-repeat system that does not require ML or personalization at the outset.

---

## Opportunity

If Ozi can intercept the routine replenishment cycle before the user runs out — and make reordering require one tap rather than a full browse-and-checkout flow — repeat purchase rate within 21 days can meaningfully improve. This does not require building a subscription model. It requires a timely push notification and a pre-filled cart deep link. Both are achievable in a single sprint.

The broader opportunity: if the experiment succeeds, Ozi establishes a behavioral pattern (Ozi reminds me, I reorder) that becomes a durable competitive advantage against generic quick-commerce players who do not invest in replenishment-specific UX.

---

## Initial Hypothesis

If Ozi triggers a reorder reminder 18–20 days after a confirmed diaper or baby essential delivery, and routes the user directly to a one-tap pre-filled repeat order, repeat purchase rate within 21 days will improve — because it removes the memory burden and eliminates the "I'll do it later" escape hatch that currently sends users to competitors.

---

## Scope Notes (Experiment-First)

This issue is scoped as a **validation experiment**, not a full product build. The minimum required to test the hypothesis:

- A trigger: push notification fired N days after `order_delivered` for diaper/essential SKUs
- A deep link: routes to a pre-filled cart with the previous order's items and quantity
- An event layer: 7 instrumented events to measure whether the flow works end-to-end
- A control group: users who do not receive the reminder, to establish organic repeat baseline

No subscription infrastructure, no ML-based timing, no personalization in V1.
