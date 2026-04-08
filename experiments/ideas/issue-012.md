---
issue_type: Enhancement
linear_workflow: Option A — parent issue + child themes (T0–T2 slices in `/create-plan`); extends Phase 4 (issue-011) shipped capabilities — does not replace merchant/UPI/compare/chat foundations
source_plan: .cursor/plans/money_mirror_10x_issue_34a61725.plan.md (Money Mirror 10x / Gen Z clarity loop)
prior_cycles: experiments/ideas/issue-011.md (Phase 4 P4-A–P4-H shipped), experiments/plans/plan-011.md
linear_root: VIJ-52 — https://linear.app/vijaypmworkspace/issue/VIJ-52/issue-012-gen-z-clarity-loop-emotional-ux-frequency-perf-slas
linear_project: https://linear.app/vijaypmworkspace/project/issue-012-gen-z-clarity-loop-emotional-ux-frequency-perf-slas-1bbe50903d79
app: apps/money-mirror
---

# Issue Title

**MoneyMirror — Gen Z clarity loop: emotional UX, frequency-first insights, and performance-to-insight SLAs**

**Type:** Enhancement

---

## Problem (Current State → Desired Outcome)

**Current state:** After Phase 4 (issue-011), MoneyMirror delivers **statement-native ground truth**, **merchant / UPI** visibility, **bad-pattern** advisories with **tap-through**, **month-over-month compare**, **facts-grounded** coaching and optional **chat**, **weekly recap email**, and **proactive** opt-in surfaces. For the core ICP — **Gen Z / young Millennials in India** who are **UPI- and quick-commerce-native** and may be **between jobs, dependent on family support, or using informal liquidity** — the product can still feel like **accurate accounting** without a complete **emotional safety + habit loop**: **small debits stay mentally invisible** (Swiggy, Zepto, entertainment micro-orders), **transactions and dense lists feel slow to resolve into a story**, and **AI value** risks sounding generic unless tightly coupled to **their** frequency and merchant clusters. **Performance** (time-to-Mirror-card, time-to-first-advisory) is not yet owned as explicit **product SLAs**.

**Desired outcome:** Users experience a **shame-reduced**, **story-first** money review: **frequency × small-ticket** signals and **merchant clusters** (“quick commerce,” “food delivery ecosystem”) are **default-visible** alongside totals; **guided reflection** (short questionnaire or 3-step review) turns data into **one commitment** for the next statement; **notifications** stay **high-signal** (recap + optional threshold) with **specific** copy tied to facts; **dashboard load** matches Gen Z **speed expectations** via **progressive disclosure**, **skeleton-first** patterns, and **lazy** heavy lists. All **generative** copy remains **facts-grounded** (Layer A + bounded txn context); no new invented amounts.

---

## User

**Primary:** Gen Z and young **Millennials in India** (including ₹20K–₹80K/month band and adjacent) who are **digitally fluent** but **avoidant or unclear** about cash flow — especially those in **transitions** (no salary for months, gig irregularity, or **reliance on parents** / informal loans) and who **lose track** of **micro-expenses** across UPI and cards.

**Secondary:** Product/owner — Linear **parent + themed children** after `/explore` → `/create-plan`; dependency awareness on **issue-011** shipped surfaces (merchant aliases, compare-months, bad-pattern advisories, proactive stubs).

---

## Why This Problem Matters

**Outcome before features:** The North Star proxy (**repeat statement upload ≤60d**, issue-009/010/011 continuity) only compounds if users **return for meaning**, not only accuracy. **Trust** (PDF truth) is necessary; **emotional safety + clarity on “where it all went”** drives **habit**. Without **frequency-native** and **cluster** views, competitors that only show **category pie charts** still win on **simplicity of story** — Money Mirror must **own the story** at **merchant + behavior** level without moralizing.

---

## Opportunity

Position MoneyMirror as the **India Gen Z** app that combines **bank-statement evidence**, **merchant-native** rollups, and a **weekly clarity loop** tuned for **UPI / quick-commerce** reality — differentiated from **SMS aggregators** and **investment-first** apps. This issue packages **UX, narrative, and perf contracts** that turn Phase 4 engineering into a **10× felt** experience for the ICP.

---

## Hypothesis

If we ship **shame-safe copy**, **frequency-first** and **clustered-merchant** surfaces, **guided money review** (questionnaire-length flows grounded in Layer A facts), and **explicit performance budgets** for dashboard/transactions — while keeping **weekly/high-signal** proactive rules — then **engagement depth** (Insights, Transactions, advisories), **repeat upload**, and **willingness to pay** (paywall experiments) will **increase** versus totals-only and generic AI narratives.

---

## Theme map (Linear-ready — parent + future children; finalize in `/create-plan`)

| ID     | Theme                         | Notes                                                                                                        |
| ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **T0** | Emotional design + perf UX    | Voice/empty states; skeleton-first; time-to-Mirror / time-to-first-advisory targets; progressive txn load    |
| **T1** | Frequency + cluster insights  | Orders/week, micro-UPI story UX, default “quick commerce / food” clusters on top of `merchant_key` + aliases |
| **T2** | Guided loop + proactive rules | 3-step review + optional saved commitment; notification copy rules; tie-in to recap / opt-in channels        |

**Depends on:** issue-011 **P4-A / P4-E / P4-F** (merchant/UPI, bad patterns, compare) as **baselines** — extend, do not fork.

---

## Non-goals

- Real-time bank link aggregation or SMS scraping as MVP of this issue.
- Investment product recommendations or credit underwriting.
- Shaming, streak-based punishment, or dark-pattern nudges.
- Replacing deterministic advisories with unconstrained LLM numeric claims.

---

## Success metrics (draft for `/metric-plan`)

- **North Star proxy (unchanged):** repeat statement upload within **60d** of first success (cohort).
- **Supporting:** `guided_review_completed` (or equivalent), **time-to-first-advisory** / **dashboard ready** timers, merchant **cluster** or **rename** engagement, **notification opt-in** vs churn, existing **bad*pattern_advisory*\***, **merchant_rollup_clicked**, recap opens.

---

## Risks / Open Questions (for `/explore`)

- **Tone:** Extend [`docs/COACHING-TONE.md`](../../apps/money-mirror/docs/COACHING-TONE.md) for **dependence / family support** without being patronizing — user testing copy.
- **Cluster taxonomy:** Who defines default “quick commerce” lists (curated merchant_key sets vs ML) — maintenance cost.
- **Performance:** Measuring **app-specific** timers vs Core Web Vitals only — what’s feasible on Vercel + Next.js 16.
- **Privacy:** Guided review **answers** — storage minimization and opt-in for retention.
- **Dependency:** Completing **`/learning`** for issue-011 and **`/linear-close`** on VIJ-43 vs starting exploration in parallel — PM choice.

---

## Personal testing protocol (repo)

1. Upload **multi-month** statements; confirm **Mirror**, **compare**, **merchant rollups**, **bad-pattern** CTAs still coherent after UX changes.
2. **Throttle** simulation: heavy dashboard loads respect `rate_limit` UX (issue-011 P4-H).
3. **PostHog:** single-source events for any new funnel (per product-lessons: instrument during build, not after).

---

## Next step

**`/explore`** — validate assumptions (competitor patterns, India UPI micro-spend, shame-safe UX), and record in `experiments/exploration/exploration-012.md`.
