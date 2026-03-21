# Issue-005: SMB Feature Bundling Engine

## Problem Statement

B2B SaaS sales teams selling into the Indian SMB market lack a fast way to compose custom feature bundles and generate tailored pricing proposals. Standard tiered pricing (Starter / Growth / Enterprise) forces SMBs to either overpay for features they don't need or go without features that would genuinely improve their operations. Sales reps are left negotiating ad hoc over WhatsApp or email with no structured tool to back them up, leading to inconsistent pricing, slow deal cycles, and lost revenue.

---

## Target User

**B2B SaaS Product Manager / Sales Lead** at an Indian software company selling to SMBs.

They own the product catalogue, control what features are available, and are responsible for closing deals with price-conscious SMB buyers. They understand the product deeply but lack tooling to rapidly assemble and pitch custom bundles without involving engineering or finance.

---

## Why This Problem Matters

Indian SMBs represent the largest untapped software buyer segment in Asia — over 63 million businesses, the majority still running on manual processes or legacy tools. They are not unsophisticated; they are value-rational. They will pay for software that demonstrably saves money or time, but they will not pay for bloated enterprise bundles.

The current cost of this mismatch:
- **Longer sales cycles** — every deal requires a custom back-and-forth
- **Pricing inconsistency** — PMs and sales reps quote different numbers for the same features
- **Lost deals** — SMB owners disengage when the pitch feels generic or the price isn't anchored to their specific problems
- **Wasted PM time** — manually writing proposals for each prospect is not scalable

---

## Opportunity

If a PM can assemble a custom feature bundle in under 2 minutes and immediately receive a value-based pricing proposal and a culturally-tuned email pitch, they can:

1. Close deals faster by responding to SMB enquiries on the same call
2. Standardise pricing logic across the sales team
3. Increase deal conversion by anchoring proposals to ROI and operational efficiency — the two metrics Indian SMB owners care about most
4. Use the tool as a live demo during sales calls to build perceived product sophistication

---

## Initial Hypothesis

If we build a dynamic feature selection board for B2B SaaS PMs targeting Indian SMBs, it will solve the problem of slow, inconsistent, and poorly-pitched custom proposals — resulting in shorter sales cycles and higher deal conversion rates.

---

## Build Notes (10-Minute Scope)

- Next.js app with a checklist of dummy SaaS features (e.g., "Automated Invoicing", "GST-ready Reports", "WhatsApp Notifications", "Role-based Access")
- User selects features → clicks "Generate Pitch"
- Fires a prompt to Gemini to produce:
  1. A value-based pricing proposal (INR, ROI-framed)
  2. A tailored email pitch written for an Indian SMB owner (relationship tone, operational efficiency focus)
- Output rendered inline; copyable with one click
