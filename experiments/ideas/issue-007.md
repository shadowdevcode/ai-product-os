# Issue-007: Order Reliability & Support Escape Hatch

---

## Problem

When an Ozi order is delayed or incorrect, parents have no reliable way to get help or exit the situation.

The core failure loop:

1. Order is late (30-min SLA broken — avg real delivery 307 min for affected orders)
2. Parent opens support chat — agent says "checking" then vanishes (86% ghost rate in support tickets)
3. Parent tries to cancel — there is no cancel button in the app
4. Parent is trapped: chat is "open" with a ghost agent, no new chat can be started, no phone answered, no way out
5. Parent either waits indefinitely or buys elsewhere and leaves a 1-star review

This is not a delivery problem or a support problem in isolation. It is a **compound trust failure** — the SLA breach and the missing escape hatch amplify each other into a churn event.

---

## Signal

**Source:** Google Play Store (85 reviews, 3.9★) + 30 synthetic Freshdesk support tickets grounded in real review language.

**Analysis output (freshdesk-synthetic.json, March 2026):**

| Category | Tickets | Avg CSAT | Resolution Rate | Ghost Rate | Priority Score |
|----------|---------|----------|----------------|-----------|---------------|
| `support-ghost` | 7 | 2.0★ | **14%** | **86%** | **26.9** |
| `delivery-delay` | 10 | 2.14★ | 50% | 40% | 23.2 |
| `wrong-product` | 5 | 1.25★ | 40% | 40% | 16.6 |
| `no-cancellation` | 3 | 2.0★ | 33% | 33% | 9.2 |

**Key compound signal:** `support-ghost` scores #1 despite fewer tickets than `delivery-delay` because 6 of 7 tickets are abandoned with the customer's message as the last reply — an 86% abandonment rate. The two issues co-occur in the same customer journey.

**Representative customer voice (Play Store, March 2026):**
> *"No option to canx as the chat is open and support person has vanished. Very poor experience."* — Shweta, 1★

> *"Worst app they take money but don't delivery products customer service wale phone nhi uthta."* — Anonymous, 1★

> *"very unreliable… Tried booking a demo for the past 4 days but app always kept giving error… Eventually they scheduled it manually but no one came."* — Anonymous, 1★

---

## Target User

**Primary:** Parents of children aged 0–5 years in Gurgaon/Noida, ordering time-sensitive baby essentials (diapers, formula, rash cream, wipes) with high urgency and low tolerance for uncertainty.

**Moment of highest pain:** Evening orders (6–10 PM) when pharmacies are closing, the baby needs the product tonight, and the parent has no fallback option once the order is placed.

---

## Why This Problem Matters

1. **Direct attack on the brand promise.** Ozi's tagline is "Fast. Trusted. For Kids." Every SLA breach + ghost support interaction destroys both "Fast" and "Trusted" simultaneously.

2. **21% of reviews are 1-star.** Of those 18 reviews, ~70% mention delivery delay + support failure together. These are not one-off incidents — they are a repeating pattern.

3. **Parents talk.** Baby product buyers are word-of-mouth heavy. A trapped parent who had to borrow diapers from a neighbour while waiting for an Ozi order tells other parents. Each churn event has negative LTV multiplier effect.

4. **The UX trap is fully preventable.** The ghost-support + no-cancel loop is not a capacity problem — it is an absence of a self-serve escape hatch. This is a product decision, not an ops decision.

5. **Resolution time is catastrophically slow for an urgent category.** Avg resolution time for `delivery-delay` is 307 minutes. For `support-ghost` it is 2,880 minutes (2 days). These timescales are incompatible with the product's "urgent baby essentials" positioning.

---

## Opportunity

If parents had three things when a delivery goes wrong:
- **(a) Proactive SLA breach alert** with honest revised ETA — removes uncertainty
- **(b) Self-serve cancel/reschedule button** that activates when order is >15 min past ETA — removes the UX trap
- **(c) Reliable escalation path** (not just chat) that does not require an agent to be present — removes the ghost-support failure mode

...then a late delivery becomes a **recoverable experience** instead of a churn event. The parent stays. The trust is preserved. The 1-star review is never written.

This converts Ozi's most common failure mode into a trust-building interaction.

---

## Hypothesis

If we build an **Order Reliability & Support Escape Hatch** for parents on Ozi — combining proactive delay alerts, a self-serve cancel/reschedule trigger, and a non-chat fallback escalation path — it will break the ghost-support + no-cancel UX trap that currently converts every late delivery into a 1-star churn event, and measurably reduce 1-star review rate and post-delay churn within 30 days of launch.

---

## Notes for Research Agent

- Validate: what % of orders actually breach the 30-min SLA? (Ozi internal data needed)
- Validate: what is current support chat response time p50 / p95?
- Explore: do any quick-commerce competitors (Zepto, Blinkit, BigBasket Now) have self-serve order cancellation post-dispatch?
- Explore: what is the minimum viable escalation path that does not require live agent staffing? (WhatsApp bot, automated callback, SMS update)
- Risk: self-serve cancel post-packing incurs reverse logistics cost — threshold for when cancel is allowed needs ops input
