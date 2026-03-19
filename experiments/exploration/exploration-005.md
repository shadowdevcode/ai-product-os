# Exploration: Issue-005 — SMB Feature Bundling Engine

**Command**: /explore
**Date**: 2026-03-19
**Agent**: Research Agent

---

## Problem Analysis

**Verdict: Real problem with strong structural evidence.**

The core pain is a mismatch between how Indian SMBs buy software (value-rational, relationship-driven, ROI-anchored) and how most B2B SaaS companies sell it (tiered, feature-bloated, Western-standard pricing).

Key signals:
- **Frequency**: Every inbound SMB deal that isn't a standard tier triggers ad hoc back-and-forth — this is the default flow for any product with more than 3 features
- **User pain level**: High for PMs and Sales Leads. They are blocked at the most critical moment — a live sales conversation
- **Existing workarounds**: Google Sheets + manual email templates, WhatsApp negotiation threads, informally tweaked pricing decks. These exist, confirming pain — but they are slow, inconsistent, and not tied to actual feature logic

**Assumption (unverified)**: Indian SMB buyers respond more positively to ROI-framed proposals vs. feature-list proposals.

---

## Market Scan

| Tool | What it does | Weakness |
|---|---|---|
| CPQ tools (Salesforce CPQ, DealHub) | Configure-Price-Quote for enterprise | Too expensive and complex for Indian SMBs; requires CRM integration |
| Chargebee / Paddle | Subscription billing & plan management | Billing-layer tools, not proposal generators; no pitch output |
| Qwilr / PandaDoc | Proposal document builders | Template-based, no dynamic feature bundling; not India-SMB-tuned |
| Zoho CRM (India-native) | CRM with quote module | Full-CRM product — no lightweight bundle composer |
| AI pitch generators (generalist) | Generic email/proposal drafting | No feature selection logic; outputs generic copy without pricing anchoring |

**Unserved gap**: No tool currently combines (1) structured feature selection, (2) dynamic value-based pricing in INR, and (3) culturally-tuned pitch output for the Indian SMB context in a single, lightweight interface.

---

## User Pain Level

**Classification: Moderate-to-Critical**

- Critical for PMs running 3–10 SMB deals per week (pricing inconsistency and slow proposals are costing revenue)
- Moderate for PMs running fewer than 1 deal per week

**Best early adopter**: PM or Sales Lead at an Indian SaaS company in the ₹50L–5Cr ARR range, actively running 3–10 SMB deals per week.

---

## Opportunity Assessment

- **Market size**: 63M+ Indian SMBs; thousands of B2B SaaS sellers targeting them. Niche but concentrated addressable user base
- **Willingness to adopt**: High — solves pain at the exact moment it is felt (during a sales call)
- **Distribution difficulty**: Moderate — reachable via LinkedIn and India SaaS communities (SaaSBoomi, iSPIRT)

**Key risk**: This is a PM productivity tool. Adoption requires displacing existing workarounds (WhatsApp + spreadsheet). Must produce materially better output in less than 2 minutes to win.

---

## Proposed MVP Experiment

**Core feature (build this):**
- Feature selection board with ~10 pre-loaded dummy SaaS features
- User selects features → "Generate Bundle Proposal"
- Gemini (structured output): (a) INR value-based price + ROI justification, (b) 150-word email pitch for Indian SMB owner

**Intentionally excluded:**
- Saved bundles / persistence
- Custom feature addition
- CRM integration or PDF export
- Multi-user / team features
- Real pricing logic from a live catalogue

**Learning to generate:**
1. Does AI output quality satisfy a real PM's bar for sending to a prospect?
2. Do PMs copy and send the AI-generated pitch, or heavily edit it?
3. Which feature combinations get selected most?

**Validation method**: Share with 3–5 PMs at Indian SaaS companies → observe if output is used unedited. If >50% send with <20% edits, output quality clears the bar.

---

## Risks

### Technical
| Risk | Severity | Mitigation |
|---|---|---|
| Gemini INR pricing hallucination | Medium | Use structured output JSON schema; anchor prompt with explicit price range constraints |
| Dummy feature catalogue lacks specificity | Low (V1) | Acceptable for MVP; V2 issue |

### Market
| Risk | Severity | Note |
|---|---|---|
| PMs don't trust AI-generated pricing | High | Central hypothesis to test |
| Tool-generated pitch feels impersonal | Medium | Tone must be warm, direct, ROI-anchored — promptable but needs user validation |
| "Good enough" workaround exists | Medium | Must produce better output in less time than WhatsApp + Sheets |

### Distribution
| Risk | Severity | Note |
|---|---|---|
| Hard to reach B2B SaaS PMs without community | Medium | Warm intros from builder's network needed for first 5 testers |
| One-time use if feature list too limited | Low (V1) | Acceptable — V1 is a validation experiment, not retention play |

---

## Final Recommendation

**Build**

The problem is real, the gap is unoccupied at the right weight class, and the MVP is genuinely small. The central risk — whether PMs trust AI-generated pricing proposals enough to send them — is testable in days, not months.

**Critical condition**: Gemini prompt for pricing must use structured output (JSON schema) to constrain INR price to a reasonable range, include ROI framing anchored to 2–3 specific business outcomes, and write the pitch in warm, direct tone — not corporate boilerplate.

**Next command**: `/create-plan`
