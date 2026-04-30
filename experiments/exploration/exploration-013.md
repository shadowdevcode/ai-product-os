---
issue: issue-013
command: /explore
date: 2026-04-12
agent: Research Agent
recommendation: Build
---

# Exploration: PM Research Copilot — chat-first planning + orchestrated evidence

---

## Problem Analysis

**What is real**

- **Assumption (strong):** Product managers doing discovery, competitive research, or feature validation repeatedly switch between **chat UIs**, **tabs** (reviews, forums, docs), and **docs** (notes, PRDs). The pain is **frequency** during active discovery windows (roadmap season, competitive fire drills, pre-launch validation), not necessarily every day.
- **Workarounds today:** General-purpose LLMs (**ChatGPT**, **Claude**) for synthesis without durable **source contracts**; **Perplexity**-style answer engines for quick citations but limited **plan approval** and **mid-run steering** as first-class UX; **spreadsheet + manual copy**; **enterprise competitive intelligence** tools that are often **dashboard / alert–first**, not **co-planning chat–first**.
- **What the issue gets right:** The differentiator is not “more summaries” — it is **agency**: **clarify → propose a bounded plan → explicit confirm → execute with visible progress → steer → evidence-backed export**. That workflow failure mode (rigid wizards _or_ shapeless chat) is a **real UX gap** for PM-grade research.

**Why it matters**

- Wrong discovery conclusions are **expensive** (roadmap waste, missed threats, slow iteration), but the problem is usually **moderate urgency** unless tied to a deadline — then it spikes to **high urgency**.
- **North star** from the issue (“feels like a smart research partner vs batch script”) is **subjective but measurable** proxy-able via session completion, steering rate, and export usage — aligned with **product-principles** (outcome before features, evidence over opinion).

---

## Market Scan

### Adjacent categories

| Category                                    | Examples (illustrative)                             | Strength                                       | Gap vs this issue                                                                                                                   |
| ------------------------------------------- | --------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **General AI assistants**                   | ChatGPT, Claude                                     | Flexible, fast                                 | No default **plan contract**, **coverage/confidence** UX, or **orchestrated multi-source** run with **steer**                       |
| **Answer / research engines**               | Perplexity, etc.                                    | Citations, quick scans                         | Optimized for **single-turn Q&A**, not **multi-step approved research jobs** with **live progress + redirect**                      |
| **Competitive / market intel (monitoring)** | Lantern, Competitaurus, ProdPilot-style positioning | Ongoing **signals**, alerts, landscapes        | Often **push / dashboard–centric** or **“autonomous employee”** narrative — not **interactive PM-led** planning loop                |
| **Enterprise CI platforms**                 | Klue, Crayon, AeraVision-style assistants           | Battlecards, sales enablement, curated corpora | Heavy **GTM / sales** fit, **enterprise** motion; less **solo PM** “one session, one question” speed                                |
| **Customer research hubs**                  | Dovetail, Productboard                              | Interviews, feedback themes                    | Strong for **owned qual data**; weaker for **ad-hoc public web + app reviews + forums** in one **chat** without a research ops team |

**Interpretation:** The space is **crowded at the category level** (“AI research”, “competitive intel”) but **underserved on the specific interaction model**: **chat-native planning + explicit approval + transparent multi-agent execution + mid-run steering + exportable PM artifact** as the **core loop**, not a side panel.

### Gaps to own (if shipped narrowly)

1. **Plan object in the UI** — sources, depth, time budget, known gaps — **before** spend.
2. **Run transparency** — step list, per-source status, **confidence / coverage** callouts.
3. **Steering primitives** — “deeper on Reddit”, “drop Quora”, “add G2” as **control verbs**, not new chats.
4. **Export** — structured **findings + citations** (Markdown / doc), not raw dump.

---

## User Pain Level

**Classification: Moderate — situational spikes to high**

- **Not** “hair on fire” infrastructure (e.g. outage) for most weeks.
- **Is** recurring for PMs in discovery: **time lost reconciling sources**, **trust issues** with generic AI, **stakeholder pressure** for “something defensible by Friday.”
- **Secondary users** (founders, UXRs) share the same **speed vs rigor** tension; **enterprise** internal-note ingestion is a **later** wedge (scope risk).

**Reasoning:** Pain intensity rises with **decision stakes** and **deadline proximity**; product-market fit should be validated on **repeat use** in those spikes, not only casual curiosity.

---

## Opportunity Assessment

**Meaningful value — conditional on execution**

- **Market size:** Broad “PM tools” TAM is large; **realistic SAM** for v1 is **solo/small team knowledge workers** doing **public-signal research** (global English-first is a practical MVP constraint unless you regionalize sources later).
- **Willingness to adopt:** High **if** first session produces **defensible, citable** output faster than manual + ChatGPT; low if it feels like **another wrapper** with **opaque automation**.
- **Distribution difficulty:** **High** — crowded narrative (“AI research”). Differentiation must be **demoable in 10 minutes**: plan → run → steer → export.

**Architecture alignment (from `knowledge/architecture-guide.md`)**

- **Monolith-first Next.js** on **Vercel** remains a sensible MVP container: API routes for orchestration, **async** job pattern (cron/worker fan-out or queue) for longer runs — **no** premature microservices.
- **Long-running research** must respect **serverless timeouts** — design **chunked steps**, **persisted job state**, and **streaming progress** to the client (patterns already familiar in this repo’s cron/worker style).

---

## Proposed MVP Experiment

**Goal:** Validate the **interaction model** and **trust** (citations, steering, plan approval), not full source coverage.

**Core (must ship for experiment)**

1. **Chat thread** with **clarifying questions** (bounded).
2. **Plan preview** artifact: intent, **source list** (e.g. web + **one** forum/reddit path via API or approved fetch strategy), **depth** slider or discrete levels, **time budget**.
3. **Approve / edit** gate — no silent long run.
4. **Execution** with **visible steps** (sub-agent boundaries can be **logical** first — “fetch → extract → cluster → synthesize”).
5. **Mid-run steering** — at least **one** working command class (e.g. “skip last source”, “add Reddit subquery”).
6. **Output:** **Findings** with **inline citations** + **export** (Markdown minimum).

**Intentionally excluded (v1)**

- Full **App Store / Play Store** API breadth (pick **one** public review surface or defer).
- **Production-scale** scraping of **Reddit** / forums without **API / compliance** decision — use **official API**, narrow subreddits, or **manual URL** ingest for MVP.
- **Internal docs**, **SSO**, **multi-tenant enterprise** admin.
- **Autonomous 24/7 monitoring** (that is a different product than **session-based** research partner).

**What we must learn**

- Do users **approve** plans or always edit? (**Friction vs trust.**)
- Do they **steer** mid-run when enabled? (**Agency hypothesis.**)
- Do they **export** and reuse text in a real PRD/email? (**Value completion.**)
- Where do **trust failures** appear? (hallucination, missing sources, shallow coverage)

---

## Risks

| Risk                                        | Class             | Mitigation (MVP)                                                                                                         |
| ------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **ToS / scraping / API limits**             | Technical + legal | Prefer **official APIs** and **user-supplied URLs**; block risky domains; rate-limit; log source fetch errors explicitly |
| **Hallucinated synthesis**                  | Product trust     | **Retrieve → quote → then synthesize**; show **gaps**; force **minimum citation density** in UI                          |
| **Latency & cost**                          | Technical         | **Tiered depth**; **async jobs**; cache fetches; small model for extraction, larger for synthesis                        |
| **Differentiation vs Perplexity / ChatGPT** | Market            | Own **plan/approve/steer** UX and **job object**, not “another search box”                                               |
| **Scope creep** (“add every source”)        | Product           | **Frozen source modules** per milestone; **coverage meter** instead of infinite breadth                                  |

---

## Final Recommendation

**Build**

**Rationale:** The problem is **real** for PM discovery workflows; competition validates demand but leaves room for a **distinct orchestration + control-plane** experience. Success depends on a **narrow MVP** that proves **trust + steering + export**, not parity with full competitive intel suites.

**Explore further** (parallel, not blocking Build): Legal review on target sources; pricing/cost model per research job; 3–5 **scripted user tests** on plan + steering copy.

**Discard** would only apply if MVP sessions show users **skip planning**, **never steer**, and **do not export** — i.e. they only want **one-shot answers** (then Perplexity wins).

---

## Suggested priority order (for `/create-plan`)

1. **T0** — Chat + **plan object** + approve/edit + **sync/async run shell** + progress UI + Markdown export with citations.
2. **T1** — **Sub-agent modules** (at least two distinct fetch paths + shared analysis pass) + **steering** commands + **coverage/confidence** surfacing.
3. **T2** — Deeper **review/forum** + **JTBD/pain clustering** quality + richer export (e.g. doc template).

---

## Next step

**`/create-plan` issue-013** — PRD + UX for the plan/run/steer loop, orchestration architecture (job model, timeouts), and explicit **non-goals** for source scope.

**Checkpoint:** Run **`/linear-sync issue`** (or equivalent) after plan exists if your Linear workflow requires issue mirroring before execution.
