# Ozi Reorder Experiment Workflow
## AI-Assisted Product OS — Live Demo Script
### Format: 6 screens · 5–10 minutes · Founder walkthrough

---

## Opening Narration (60–90 seconds)

> "I want to show you something specific — not a generic AI tool demo, and not a roadmap presentation.
>
> What I'm going to walk you through is exactly how I would approach one early-stage problem for a company like Ozi: a baby care startup operating dark stores in Delhi-NCR.
>
> The problem I picked is repeat purchase. Because for a dark-store business, the CAC only makes sense if the customer comes back. And the risk at this stage isn't that you don't know what to build — it's that you might build the wrong thing before you've confirmed repeat behavior is even emerging.
>
> What I'm going to show is how I move from a rough business question to a structured, testable experiment — with a hypothesis, a user flow, a metric plan, and an RCA framework — using an AI-assisted operating system that does the documentation and coordination work so I can stay focused on the actual thinking.
>
> Six screens. Let's go."

---

## Screen 1 — Business Context

**Headline:** Ozi is 4–5 dark stores in. The question isn't what to build — it's what to test first.

**Bullets:**
- At this stage, the riskiest move is shipping a big feature nobody repeats
- The goal isn't a product roadmap — it's signal: is repeat behavior emerging at all?
- Limited data, limited runway, limited margin for wrong bets
- Dark-store model means unit economics live or die on reorder frequency
- Focus energy on reducing uncertainty before committing engineering capacity

**Presenter Script:**
> "When I look at Ozi, the first thing I want to understand is not 'what feature should we build next.' It's 'do we have repeat buyers, and if not, why not?'
>
> At 4–5 dark stores, you're still in the window where habits are forming. Parents who ordered from you once are either going to make Ozi their default or settle into a Blinkit or Zepto habit instead. That decision is being made in the next 21 days, not the next 6 months.
>
> So before I think about loyalty programs, subscriptions, or recommendations — I want to run one clean experiment that tells me: does a timely nudge change repeat behavior? That's the question this demo is built around."

---

## Screen 2 — ICP + User Pain

**Headline:** Two types of parents. One shared frustration.

**Bullets:**
- **Emergency Parent** — Ran out of diapers at 10pm. Chose Ozi for speed. Will choose whoever gets there first next time — unless Ozi catches them before the emergency
- **Routine Replenishment Parent** — Buys monthly. Forgets to reorder until they're almost out. Low brand loyalty, high convenience loyalty. Currently forming habits
- **First-Time Parent** — Unsure of sizes, brands, quantities. Needs guidance and trust, not a catalogue
- **Shared pain:** No signal from Ozi that it's time to reorder. App feels like a marketplace, not a replenishment partner
- **The competitor win:** Parent opens Blinkit out of habit, adds diapers to cart, checks out — Ozi never entered the consideration set

**Presenter Script:**
> "The user here isn't one person. It's really two or three types of parents with different motivations — but they hit the same wall: Ozi doesn't remind them.
>
> The emergency parent chose you once because you were fast. But if they run out again and open Blinkit out of habit, you've lost them — not because your product is worse, but because you didn't intercept the moment.
>
> The routine replenishment parent is the most valuable and the most at risk. They know what they need, they just forget to buy it. If you can own that moment — be the app that reminds them and makes it effortless — that parent becomes a weekly habit. Miss it, and Zepto owns them.
>
> The pain isn't that Ozi's product is bad. It's that the app is designed for discovery, not for replenishment. Those are two fundamentally different jobs."

---

## Screen 3 — Hypothesis

**Headline:** One hypothesis. One test. Three weeks.

**Bullets:**
- Hypothesis: A timely reorder reminder + one-tap repeat order will improve repeat purchase rate within 21 days
- Why: It removes memory friction ("I forgot") and eliminates the "I'll do it later" escape hatch
- Why testable now: Small cohort, binary outcome, zero ML or personalization required in V1
- What it is NOT: A subscription product, a loyalty program, or a personalization engine
- Decision point in 3 weeks: Did the test group reorder more than control? Yes → build. No → diagnose why

**Presenter Script:**
> "Here's the hypothesis, written in one sentence:
>
> 'If Ozi triggers a timely reorder reminder 18 to 20 days after a diaper delivery and routes the user directly to a pre-filled repeat order, repeat purchase rate within 21 days will improve — because it removes the memory burden and the I'll-do-it-later escape hatch.'
>
> What I like about this hypothesis is that it's falsifiable in three weeks, it requires no machine learning, no subscription infrastructure, and no personalization. It's a push notification and a deep link. The question it answers is structural: does the reminder change behavior at all? If yes, we have the foundation for something bigger. If no, we know exactly where to look."

---

## Screen 4 — Experiment Design

**Headline:** MVP Experiment: Reorder Reminder + One-Tap Repeat

**Bullets:**
- **Cohort:** First-time diaper buyers in the last 60 days who have not reordered
- **Test group:** Push notification on Day 18–20 post-delivery, routed to a low-friction repeat order path
- **Control group:** No reminder — measure organic repeat rate as baseline
- **Message:** "Your [Brand] order was [X] days ago — time to restock? Reorder in 1 tap →"
- **Flow:** Notification → repeat order path → confirm quantity → place order → done

**Two implementation decisions (pending engineering confirmation):**

*1. Trigger mechanism*
- **Option A** *(if event-triggered notification tooling exists)*: Hook into `order_delivered` event and schedule the push at `delivered_at + 18–20 days` using existing workflow tooling (e.g., OneSignal, CleverTap, Braze). No new cron needed.
- **Option B** *(if tooling does not exist)*: Daily cron job queries orders delivered 18–20 days ago, fans out per-user push invocations with `Promise.allSettled`, caps at 500 users per run. Fully observable via cron log table.

*2. Repeat order path*
- **Option A** *(if a pre-filled cart deep link or repeat-order API already exists)*: Notification links directly to a pre-filled cart with the user's previous SKU and quantity. User taps "Place Order" — done.
- **Option B** *(if no deep link capability exists)*: Notification links to a lightweight `/reorder/:orderId` screen — single product card, quantity pre-set to last order amount, editable, standard "Add to Cart" CTA into existing checkout.

**What both paths share:** The user never browses. They tap the notification, see their previous order, confirm, done. The implementation path depends on Ozi's existing infra — the UX principle does not.

**Presenter Script:**
> "The experiment itself is intentionally minimal. I'm not building a subscription flow or a smart timing engine. I'm asking: if I remind someone at the right moment and make reordering require one tap, does that change what they do?
>
> The cohort is tight — first-time diaper buyers from the last 60 days who haven't come back. We split them into test and control. Test gets the push notification on Day 18 or 19. Control sees nothing. We measure whether the test group reorders within 21 days at a higher rate than control.
>
> Now — I've deliberately left two implementation questions open rather than assuming Ozi already has the plumbing. The trigger either hooks into an existing notification workflow, or it's a cron job we build. The repeat order path either uses a pre-filled cart deep link if that exists, or it's a lightweight screen we add. Both paths lead to the same user experience: one tap, no browsing, no decisions. Which path we take is a one-conversation scoping question with engineering — not a reason to delay the experiment design."

---

## Screen 5 — Metrics + Event Instrumentation

**Headline:** Zero-to-one metrics: what to track when you have no history

**Bullets:**
- **North Star:** Repeat order rate within 21 days — test group vs. control group
- **Supporting metrics:** Median time to second order · Reorder reminder CTR · Repeat order completion rate · Cancellation or stockout rate on repeat orders
- **Events to instrument:**
  - `order_placed` → `order_delivered` (baseline trigger)
  - `reorder_reminder_sent` → `reorder_reminder_clicked`
  - `repeat_order_started` → `repeat_order_completed` → `repeat_order_failed`
- **Why these seven:** They cover the full funnel and isolate exactly where drop-off happens
- **Minimum viable signal:** If CTR is >10% and completion rate is >50%, the mechanic works — scale it

**Presenter Script:**
> "At this stage, you don't have a retention dashboard. You probably don't have a data warehouse. That's fine. What you need are seven events that tell you whether this experiment worked.
>
> The North Star is simple: did the test group reorder more than control within 21 days? Everything else helps you diagnose why or why not.
>
> If reminder CTR is low — the message or timing is wrong. If CTR is fine but completion drops — the UX is broken somewhere between the notification and checkout. If repeat_order_failed spikes — you have an inventory or reliability problem, not a PM problem.
>
> These seven events give you the diagnostic resolution to know exactly which lever to pull next."

---

## Screen 6 — RCA + Backlog Loop

**Headline:** If it fails, here's exactly how we find out why

**Bullets:**
- **Wrong segment** → repeat rate is near-zero in both test and control → hypothesis about who is a repeat buyer is wrong → test with subscription-intent parents or higher-frequency SKUs
- **Wrong timing** → reminder CTR is <5% → Day 18 is too early or too late → A/B test Day 14 vs. Day 21
- **Wrong messaging** → CTR is decent but cart abandonment is high → message created an expectation the flow didn't deliver → rewrite copy, fix cart pre-fill accuracy
- **UX friction** → pre-filled cart shows wrong size or wrong product → user exits without ordering → fix deep-link payload, add quantity confirmation step
- **Inventory / reliability** → `repeat_order_failed` events spike → operational problem, not a PM problem → escalate to ops and dark-store leads
- **Loop:** RCA output → tagged backlog item → next experiment hypothesis → new test cycle

**Presenter Script:**
> "Here's the part most PM decks skip: what do we do if it doesn't work?
>
> The experiment doesn't fail — it produces a signal. And the signal tells you where the problem is.
>
> If both test and control groups have zero repeat buyers, the problem isn't the reminder — it's the cohort. Maybe first-time buyers aren't the right target.
>
> If the reminder goes out and nobody clicks, the timing or the message is wrong. That's a copy and scheduling problem, not a product problem.
>
> If they click but don't complete the order, the UX broke somewhere. Maybe the cart pre-fill showed the wrong size.
>
> Each failure mode maps to a specific next action. Nothing goes into a dead backlog. It goes into the next experiment cycle with a sharper hypothesis."

---

## Closing Slide — How AI-Assisted Product OS Compresses Idea → Experiment → Execution

**Headline:** From rough idea to structured experiment in hours, not weeks

**What the system generates:**
- **Experiment brief** — ICP definition, hypothesis, test/control design, cohort criteria
- **PRD draft** — user stories, acceptance criteria, edge cases, out-of-scope items
- **Metric + event plan** — instrumentation spec, North Star definition, supporting metrics
- **Edge case list** — what breaks in the UX, the backend, and the ops layer
- **QA checklist** — reliability scenarios, network failures, concurrent order handling
- **Post-launch RCA template** — pre-built failure taxonomy so analysis starts immediately after launch

**The key distinction:**
> This doesn't replace PM thinking. It eliminates the documentation and coordination overhead that sits between a PM's insight and the team's execution — so the PM can spend more time with customers, more time making decisions, and less time in Google Docs.

**What this means for Ozi:**
- A PM at Ozi can go from "we should do something about reorders" to a fully structured, reviewable experiment brief in one session
- The system enforces quality gates — each stage requires the previous one to pass before moving forward
- Every experiment generates learnings that feed back into the next cycle — the system gets smarter with each project

---

## Closing Narration (30 seconds)

> "What you just saw wasn't AI generating a product strategy. It was AI doing the coordination and documentation work that would normally take a PM two or three days — so the PM can focus on the one question that actually matters: is this the right problem to solve right now?
>
> That's the value. Not replacing judgment. Compressing the time between insight and action.
>
> Happy to show you the system behind this, or go deeper on any of the six screens."

---

*Demo duration: 5–8 minutes · Presenter notes included in each section · Designed for live walkthrough with a founder or PM audience*
