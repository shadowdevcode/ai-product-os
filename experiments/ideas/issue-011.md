---
issue_type: Enhancement
linear_workflow: Option A — parent issue + child issues P4-A–P4-H (epics); execute T5–T6 from issue-010 as P4-F when prioritized
source_plan: .cursor/plans/moneymirror_phase_4_issue_93cc59db.plan.md (MoneyMirror Phase 4 Issue)
prior_cycles: experiments/ideas/issue-009.md (ICP + Warikoo research), experiments/ideas/issue-010.md (Phase 3 T1–T4 shipped; T5–T6 deferred)
app: apps/money-mirror
---

# Issue Title

**MoneyMirror Phase 4 — Merchant-native visibility, proactive coaching, and growth readiness**

**Type:** Enhancement

---

## Problem (Current State → Desired Outcome)

**Current state:** After Phase 3 (issue-010), MoneyMirror has **unified scope**, **transactions as ground truth**, **merchant rollups**, and **facts-grounded AI coaching**. Power users still experience **bucket-first** highlights (needs / wants / debt) while **merchant and UPI-shaped reality** (e.g. Zomato, Amazon, food delivery, small UPI debits) is uneven: heuristic `merchant_key` and parser variance drive **high “other”** and scattered “wants.” **Weekly email** exists; there is **no** conversational “ask my money” surface, **no WhatsApp**, and **limited proactive** nudges beyond recap. **Issue-009** vision items remain **partial** (coach that “comes to you,” goals/SIP ladder, phone-first signup drift). **Phase 3 T5–T6** (URL-backed IA polish, month-over-month compare) remain **deferred**.

**Desired outcome:** Users can clearly see **where money went** at **merchant / UPI-handle** granularity with **actionable “stop next month”** framing; **ingestion** supports serious personal testing (multi-month PDFs, queue, limits policy); optional **chat** answers only from **Layer A facts + transactions** (no invented amounts); **proactive** channels (richer email, optional WhatsApp spike, web push) and **bad-pattern** detection extend the advisory engine; **T5–T6** ship as part of this phase when prioritized; **paywall / Product Hunt** readiness is researched and scoped.

---

## User

**Primary:** Gen Z Indians (₹20K–₹80K/month) on mobile — **UPI-native**, multi-account, uploading **bank + credit card** PDFs, needing **visibility** into discretionary and micro-spend.

**Secondary:** PM/owner — Linear **parent + epics** (P4-A–P4-H) without duplicating closed **VIJ-37** work; follow [`production-launch-checklist-010.md`](../../experiments/results/production-launch-checklist-010.md) for production promotion hygiene.

---

## Why This Problem Matters

**Outcome before features (product principles):** Success means users **trust** headline numbers, **act** on specific leaks, and **return** with new statements — supporting the North Star proxy (**repeat statement upload**, issue-009/010 continuity). Without **merchant-native** clarity and **proactive** touchpoints, the product risks feeling like **generic budgeting** versus **evidence-backed coaching** (issue-009 wedge vs SMS-first apps).

---

## Opportunity

Shipping Phase 4 positions MoneyMirror for **paid** positioning (hypothesis from issue-009, e.g. ₹299/mo) and **distribution** (Product Hunt) with a crisp story: **statement-native truth + merchant evidence + consequence-first coaching for India**. Linear stays PM-facing: **one umbrella** + **child epics** pulled one at a time after `/explore` → `/create-plan`.

---

## Hypothesis

If we improve **merchant/UPI visibility**, **ingestion trust** (queue, limits, golden PDFs), and **proactive + optional chat** surfaces — all **grounded** in stored transactions and Layer A facts — then **engagement** (transactions/insights depth), **repeat upload**, and **willingness to pay** will rise versus bucket-only AI highlights alone.

---

## Epic map (Linear-ready — parent + children)

| ID       | Theme                             | Notes                                                                                          |
| -------- | --------------------------------- | ---------------------------------------------------------------------------------------------- |
| **P4-A** | Merchant + UPI visibility v2      | Reduce “other”; user rename map; UPI handle display; optional Gemini re-label spike with audit |
| **P4-B** | Ingestion scale + trust           | Queue UX; upload limits for heavy testers; parse-quality/debug; golden PDF regression          |
| **P4-C** | Conversational coach (facts-only) | Chat over `buildLayerAFacts` + txns; citations; rate limits                                    |
| **P4-D** | Proactive + channels              | Richer email; WhatsApp spike; optional web push                                                |
| **P4-E** | Bad-pattern detection             | Micro-UPI totals, recurring, CC min-due — extend `advisory-engine.ts`                          |
| **P4-F** | Deferred **T5–T6**                | URL-backed tabs polish; month-over-month compare                                               |
| **P4-G** | Monetization + Product Hunt       | Pricing experiment; paywall; launch checklist                                                  |
| **P4-H** | Hardening                         | Per-user rate limits on heavy reads; Gemini abort follow-up                                    |

---

## Risks / Open Questions (for `/explore`)

- **Regulatory / product safety:** “Educational not advice” as chat and notifications scale — [`docs/COACHING-TONE.md`](../../apps/money-mirror/docs/COACHING-TONE.md).
- **Privacy & compliance:** WhatsApp/SMS imply new consent and vendor DPAs.
- **Cost:** Gemini batch vs per-txn enrichment; chat token usage at scale.
- **Competitive:** Statement-first vs real-time SMS apps — hybrid roadmap (e.g. email forward) may be needed later.
- **Parser variance:** Golden-set testing and issuer-specific fixtures.

---

## Personal testing protocol (repo)

1. **Golden PDFs** per issuer (clean + messy).
2. **Neon:** `statements.status = processed`, `transactions` count/sum vs expectations.
3. **App:** Same **scope** across Overview, Transactions, Insights merchant row.
4. **PostHog:** `statement_parse_success`, `transactions_view_opened`, `merchant_rollup_clicked`.
5. **Limits:** `parse/route` — 3 uploads/day, 10 MB; plan multi-day tests or staging policy (P4-B).

---

## Next step

**`/explore`** — validate market/risks for Phase 4, then **`/create-plan`** for PRD + AC per epic.
