---
issue_type: Enhancement
linear_workflow: Option A — parent issue + child issues T1–T4 (P0/P1); T5–T6 deferred to backlog until T3 validated
source_plan: .cursor/plans/moneymirror_pm_ux_plan_08398100.plan.md (MoneyMirror PM UX Plan)
app: apps/money-mirror
---

# Issue Title

**MoneyMirror Phase 3 — Unified multi-source dashboard, transaction-native insights, and expert AI coaching**

**Type:** Enhancement

---

## Problem (Current State → Desired Outcome)

**Current state:** MoneyMirror rehydrates dashboard data around a **single-statement** mental model; filters skew toward month/statement pickers rather than a **global date range across all uploads**. There is **no transaction-level UI** as ground truth. Insights skew **bucket-level** (“Wants is high”) rather than **merchant-specific** (e.g. Zomato ₹X over N transactions). **Generative coaching** is not yet anchored on server-computed **facts JSON** with strict schema + tone guardrails. Multi-account / bank + credit card uploads are not yet unified in one **scope model** with clear **perceived vs actual** behaviour under rollups.

**Desired outcome:** One **unified dashboard** for bank + credit card statements over time, with **date + source scope**, a **transactions API + UI** as source of truth, **merchant-level rollups** with **Overview↔Insights** coupling and deep links, and an **AI track** where rules + optional Gemini narrative only reference **Layer A facts** (no hallucinated amounts). **P0–P2** phasing: **T1→T4** first; **T5–T6** after validation (per PM plan).

---

## User

**Primary:** Gen Z Indians (₹20K–₹80K/month) using MoneyMirror on mobile, uploading **multiple** bank and/or card statements over time.

**Secondary:** PM/IC owner (you) tracking delivery via **Linear parent + T1–T4 children** without duplicate scope vs **VIJ-25** (Sprint 4 backlog).

---

## Why it Matters

Trust requires **transaction truth** before insights and AI can feel credible. Without **unified scope**, users cannot reason across accounts; without **merchant evidence**, coaching stays generic and **North Star** nudges (e.g. second upload) lack a concrete hook. **Expert-style** coaching needs **deterministic numbers** from the server, not free-form model invention.

---

## Opportunity

Delivering Phase 3 positions MoneyMirror as **multi-statement-native**, **filter-native**, and **evidence-backed** — closer to a credible “finance guide” than a single-PDF demo. **Linear** stays PM-facing: **one umbrella issue** plus **T1–T4** children you pull **one at a time**, aligned with `/explore` → `/create-plan` → `/execute-plan` when you start implementation (**no code in this `/create-issue` run**).

---

## Hypothesis

If we ship **transaction surface + unified scope + merchant rollups + facts-grounded AI coaching** for MoneyMirror users with **multiple statements**, users will **trust** category and coaching views more, return to **upload a second statement** sooner, and **reduce support-like confusion** (“why doesn’t this match my PDF?”) because the UI always points to **line-level evidence**.

---

## Risks / Open Questions (for `/explore` and `/create-plan`)

- **PDF / parser variance** across issuers; **merchant normalization** v1 (heuristic vs Gemini post-pass — cost/latency).
- **Regulatory / product safety:** generative copy must stay **educational, not advice**; [`docs/COACHING-TONE.md`](../../apps/money-mirror/docs/COACHING-TONE.md) must extend with **expert examples** as generative surface grows.
- **Performance:** cross-statement aggregation and pagination; rate limits if queries move beyond in-memory assumptions.
- **Perceived vs actual** under **all-sources** rollup — **explicit PRD decision** (single blended number vs per-account) before UI lock-in.
- **VIJ-25 overlap:** F3, G2–G3, H3 — **merge or supersede** into Phase 3 children to avoid duplicate tickets (stakeholder checklist in source plan).

---

## Task map (repo contract — T1–T6)

| ID     | Priority | Theme                                                                          |
| ------ | -------- | ------------------------------------------------------------------------------ |
| **T1** | P0       | Transaction surface + API (foundation)                                         |
| **T2** | P1       | Unified scope model — single dashboard, multi-source                           |
| **T3** | P1       | Merchant rollups + Overview↔Insights coupling                                  |
| **T4** | P1       | AI / coaching upgrade — expert guide (facts + structured Gemini)               |
| **T5** | P2       | IA + growth (URL-backed tabs, desktop share) — **defer** until T1–T3 validated |
| **T6** | P2       | Compare months + hygiene — **defer**                                           |

Detailed acceptance themes live in the source plan; formal AC belongs in **`/create-plan`** output (`experiments/plans/plan-010.md`).

---

## Next step

**`/explore` done** — see `experiments/exploration/exploration-010.md` (**Build**). Run **`/create-plan`** for PRD + architecture + **AC per T1–T6**. **No `/execute-plan`** until you explicitly start implementation.
