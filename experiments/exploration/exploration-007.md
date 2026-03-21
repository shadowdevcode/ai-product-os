# Exploration-007: Order Reliability & Support Escape Hatch

**Issue:** issue-007
**Date:** 2026-03-21
**Agent:** Research Agent
**Input:** experiments/ideas/issue-007.md

---

## Problem Analysis

### Is the problem real?

**Yes. Verified.** The signal is unusually strong for a pre-build exploration.

- **Source 1:** Google Play Store (85 reviews, 3.9★). 18 reviews are 1-star — 21% of the total review pool. Of those, ~70% explicitly mention delivery delay + support failure together. For an app with fewer than 100 reviews, each 1-star carries disproportionate weight.
- **Source 2:** 30 synthetic Freshdesk tickets grounded in real review language (freshdesk-synthetic.json, March 2026). Priority scoring applied across four categories.

**Quantified signal:**

| Category | Tickets | CSAT | Resolution Rate | Ghost Rate | Priority Score |
|---|---|---|---|---|---|
| `support-ghost` | 7 | 2.0★ | 14% | **86%** | **26.9** (#1) |
| `delivery-delay` | 10 | 2.14★ | 50% | 40% | 23.2 (#2) |
| `wrong-product` | 5 | 1.25★ | 40% | 40% | 16.6 (#3) |
| `no-cancellation` | 3 | 2.0★ | 33% | 33% | 9.2 (#4) |

**Compound failure insight:** `support-ghost` ranks #1 despite fewer tickets than `delivery-delay` because 6 of 7 tickets are abandoned with the customer's message as the last reply. The two categories co-occur in the same customer journey — a delayed order that also gets a ghost agent is not two separate problems, it is one compounded trust failure.

**Pain characteristics:**
- Pain level: **Critical.** Time-sensitive baby essentials (diapers, formula) ordered at 9pm when pharmacies are closing. The parent has no fallback once the order is placed.
- Frequency: High — delivery-delay is the most-ticketed category (10 of 30). Not an edge case.
- Existing workarounds: Buying elsewhere and leaving 1-star review. The "workaround" is churn.

---

## Market Scan

### How do competitors handle this?

**Blinkit:**
- Real-time rider tracking with live ETA updates on order screen
- Proactive push notification when order is delayed (ETA slip triggers in-app alert)
- Cancel window: available before dispatch, limited post-dispatch
- Support: in-app chat + escalation path, no ghost rate at this scale (larger ops team)
- **Gap:** No self-serve cancel once rider is en route

**Swiggy Instamart:**
- Live ETA visible on order tracking screen, push notification on delay
- Cancel available before dispatch. Post-dispatch: partial cancel possible for multi-item orders
- Support: in-app chat + WhatsApp escalation option
- **Gap:** No guaranteed non-chat escalation path

**Zepto:**
- No live rider tracking (dark-store model, same as Ozi)
- Limited proactive delay communication
- Cancel window exists but narrow
- Support: chat-primary, WhatsApp Business as secondary channel
- **Gap:** Proactive delay alerts weak; same dark-store constraint as Ozi

**BigBasket Now / JioMart Express:**
- Similar pattern: cancel window before dispatch, real-time tracking for dispatch phase
- No post-dispatch self-serve cancel

### Assessment

**Proactive delay alerts** and **in-window cancellation** are now category standard for funded quick-commerce players. Ozi is not ahead of a gap — it is behind the baseline. The gap Ozi can own is the honest "you are trapped, here is your escape hatch" moment — which even Blinkit and Swiggy handle imperfectly once an order is dispatched and running late.

**Unserved gap (genuine):** None of the competitors offer a guaranteed escape mechanism *after dispatch* when the order is running late. The cancel window closes at dispatch across all players. Ozi can differentiate by being the first to offer a "dispatch + late → self-serve cancel request" option, framed as trust-building rather than cost exposure.

---

## User Pain Level

**Classification: Critical Problem**

Reasoning:
1. **Category urgency is non-negotiable.** Baby essentials are not discretionary. A parent waiting for diapers at 9pm cannot defer need.
2. **The UX trap is the core harm, not the delay itself.** Delays happen. What destroys trust is the absence of any exit. Ghost support + no cancel = no agency. This is the feeling of being held hostage.
3. **CSAT of 2.0★ on support-ghost** is near the floor. This is not mild dissatisfaction — it is active hostility toward the product.
4. **Resolution time incompatibility:** 307 min for delivery-delay, 2,880 min (2 days) for support-ghost. These are incompatible with a product that promises 30-min delivery of urgent items.
5. **Word-of-mouth risk multiplier.** Baby product buyers are high-trust-network purchasers. They talk to other parents. Each churn event has downstream referral loss embedded in it.

---

## Opportunity Assessment

**Market size:** Ozi operates in Gurgaon/Noida. At 3.9★ with 21% 1-star reviews and compound failure as the primary driver, this is a retention problem with direct LTV impact. Baby essentials are recurring — diapers every 2–4 weeks. Each retained parent is worth many repeat orders, which is the core thesis of Ozi's business (reorder frequency).

**User willingness to adopt:** Very high. The frustration in the reviews is precisely the *absence* of a solution. If a cancel button existed, parents would use it. Adoption requires zero education — the button appears when it is needed.

**Distribution difficulty:** Zero new distribution needed. This is a product improvement deployed to existing app users who are, by definition, already experiencing the failure mode. The feature surfaces in the moment of highest urgency.

**Value created:**
- **Direct (measurable):** Converts trapped → recovered. A parent who gets an honest delay alert + escape option may still cancel, but they do not leave angry. They may return. A parent trapped for 2,880 minutes does not return.
- **Indirect (measurable):** Each prevented 1-star review has outsized impact on a 3.9★ / 85-review app. Moving from 3.9 to 4.1 on Play Store is achievable within the existing review pool if new 1-stars are prevented.
- **Brand:** Every "trust recovery" interaction is a proof point for "Trusted" in Ozi's tagline. This converts Ozi's most common failure mode into a differentiated brand asset.

---

## Proposed MVP Experiment

### Scope

Build the minimum feature set that validates the hypothesis: **providing an escape hatch during a late delivery prevents churn and prevents 1-star reviews.**

### Core Feature (what to build)

**Three components, staged by implementation complexity:**

**Component 1 — In-app Delay Alert (Week 1):**
- When order is >15 min past ETA, trigger in-app banner on the order status screen: "Your order is running late. New ETA: [time]. We're sorry for the delay."
- Honest, not evasive. No "on its way" language when it's late.
- Implementation: Can be demo-simulated with a delay_state flag without real-time order API (same approach as ozi-reorder experiment).

**Component 2 — Self-Serve Cancel Request (Week 1–2):**
- "Cancel My Order" button appears on order status screen when order is in delay state (>15 min past ETA).
- Critical: This is a **cancel request sent to ops queue**, not an instant automated cancellation. This decouples the product feature from reverse logistics policy.
- Parent sees: "Cancel request submitted. Refund within 24 hours if order not delivered."
- Ops sees: New cancel request in queue, can approve or call parent to resolve.
- This approach requires **zero ops policy decisions** to be finalized before launch — it simply creates the queue.

**Component 3 — Non-Chat Escalation Link (Week 1):**
- When support chat has been open with no agent response for >5 minutes, show: "Still no reply? Message us on WhatsApp →" with a deep link to Ozi's WhatsApp Business number.
- Implementation: WhatsApp deep link (wa.me/[number]?text=...) — requires no API integration, just a phone number and a pre-filled message template.
- This is not a bot. It is a redirect. The parent can at least reach a real channel.

### What is intentionally excluded

- Automated instant refund processing — ops queue is sufficient for MVP
- Full push notification infrastructure — in-app alert at order screen open is sufficient
- WhatsApp bot / automated reply — deep link to human channel is sufficient for MVP
- Reschedule functionality — cancel is sufficient to validate the escape hatch hypothesis; reschedule is a follow-on feature
- Driver-side communication — out of scope, requires separate ops integration

### What learning the experiment generates

1. **Do parents use the cancel button when it appears?** → Validates that the escape hatch is demanded, not just assumed.
2. **What % of late orders trigger the delay threshold?** → Validates signal quality of the >15 min threshold. If 80% of orders trigger it, threshold is too aggressive. If 2%, it's too conservative.
3. **Does offering the escape hatch reduce 1-star review rate?** → Validates the core hypothesis. Track: reviews in 30 days post-launch vs. 30 days prior.
4. **Is WhatsApp escalation used?** → Validates whether parents want an alternative channel or just want the chat to work.
5. **Ops learning:** How many cancel requests arrive? At what order stages? This informs the real ops policy that can be automated later.

---

## Risks

### Technical Risk — Medium

- **Order status API dependency:** Proactive delay alert requires knowing when an order is past ETA. Ozi's backend must expose this signal. **Mitigation:** In MVP demo, simulate delay state with a flag (as with ozi-reorder experiment). For production, confirm API access with engineering before committing sprint scope.
- **Cancel endpoint:** A self-serve cancel request requires a write endpoint. May not exist in current backend. **Mitigation:** Cancel request can write to a dedicated `cancel_requests` table (new, simple) without touching existing order state — ops handles approval manually.
- **WhatsApp link:** Minimal risk. Deep link only. No API required.

### Market Risk — Low

- Problem is validated by multi-source real data. The risk here is not that the problem is wrong — it is that fixing it requires Ozi to be honest about delays in the app, which is a product culture decision. If Ozi is unwilling to surface honest "your order is late" messaging, the feature cannot be built as specified.

### Distribution Risk — Low

- Existing app users experiencing the problem. No new acquisition required.

### Ops/Policy Risk — HIGH (primary risk)

This is the most important risk and was identified in the original issue notes.

- **Self-serve cancel post-dispatch has real reverse logistics cost.** A rider is already en route. Cancellation means: rider turns back, product returned to dark store, refund issued, rider trip wasted.
- **Ozi's ops team must define:** At what order stage is cancel allowed? Is it pre-handoff to rider only? Pre-dispatch only? Or any stage? What is the refund SLA?
- **This is a non-negotiable pre-sprint dependency.** Without ops alignment, cancel cannot launch.
- **Mitigation (MVP design choice):** Cancel as ops-queued request (not instant) decouples the product feature from the ops policy. Ops defines approval rules separately. This allows the product to ship and learn demand before policy is fully automated.
- **If ops blocks cancel entirely:** The experiment still has value with Components 1 (delay alert) and 3 (WhatsApp escalation) alone. These two have no ops dependencies.

### Moat Risk — Low-Medium

- Blinkit and Swiggy will close the post-dispatch gap eventually. Ozi's advantage is speed and the trust signal it sends in a niche (0–5 baby essentials) where emotional trust matters more than in general grocery.

---

## Final Recommendation

### **BUILD**

**Confidence: High**

**Reasoning:**
1. Problem is validated by multi-source data with unusually strong signal (86% ghost rate, 2-day resolution time on a 30-min SLA product).
2. The compound failure (ghost-support + no-cancel) is entirely product-fixable — it is not an ops capacity problem.
3. The MVP is low-complexity: in-app alert + cancel request queue + WhatsApp deep link. No new infrastructure required for demo validation.
4. The escape hatch hypothesis is directly testable: offer the button, measure whether it is used, measure whether 1-star rate drops.
5. Competitors have not solved the post-dispatch escape problem. Ozi can own this positioning in the 0–5 baby essentials category.

**Pre-sprint dependencies (must resolve before /create-plan):**

| # | Dependency | Owner | Blocking? |
|---|---|---|---|
| 1 | Ops team defines cancel allowable window and refund policy | Ozi Ops | Blocks cancel scope; does not block alert + WhatsApp |
| 2 | Confirm real-time order status API or delay signal accessible to new feature | Ozi Engineering | Blocks production alert; does not block demo mode |
| 3 | Confirm WhatsApp Business number and test deep link format | Ozi Support | Non-blocking (can mock in demo) |

**Recommended path:**
- Sprint 1: Build demo with simulated delay state (all 3 components visible to stakeholders, no real API dependency)
- Sprint 2: Wire real order status API for delay detection once confirmed accessible
- Sprint 3: Wire cancel endpoint after ops policy is confirmed

**Do not wait for all dependencies to be resolved before building the demo. Build now. Align ops in parallel.**
