# Postmortem: Nykaa Personalisation (Issue-008)

This document records the root cause analysis of system failures and UX issues throughout the Issue-008 development and verification process.

## 1. Summary of Issues & Resolutions

| Priority | Issue                            | Cause                                                                               | Fix                                                          |
| :------- | :------------------------------- | :---------------------------------------------------------------------------------- | :----------------------------------------------------------- |
| **P0**   | **Telemetry latency bottleneck** | Sequential `flush()` in PostHog was adding 500ms+ to API response time.             | Implemented fire-and-forget pattern with `.catch()`.         |
| **P1**   | **SHA-256 Salt Exposure**        | `NEXT_PUBLIC_` prefix on salt introduced it into the client-side bundle.            | Removed prefix to ensure server-side only resolution.        |
| **P1**   | **Affinity Builder Timeout**     | Sequential database writes for 5000+ users exceeded Vercel's 60s lambda limit.      | Batched processing with `Promise.allSettled` (50 per chunk). |
| **P2**   | **Cohort Label Leak**            | API response returned `"control"`, exposing experiment parameters to curious users. | Normalized response to `"default"`.                          |

---

## 2. Root Cause Analysis (RCA) — Telemetry Latency

**The Incident:**
During P95 latency verification, we observed that personalized shelves were falling back to editorial content in ~30% of cases.

**The Cause:**
The `captureServerEvent` utility was awaiting the PostHog capture promise before returning the API response. Networking delays on the PostHog ingestion endpoint directly increased the time-to-first-byte (TTFB) for the shelf.

**The Solution:**
Decoupled analytics from the response path. The API now returns as soon as the database query completes, letting the analytics flush happen in the background or be gracefully ignored if it fails.

---

## 3. System Improvements (Rule Extraction)

> [!TIP]
> **Rule 1: Analytics is non-blocking.** Never `await` a telemetry event in a user-facing API route.
> **Rule 2: Batch DB writes.** Use parallel processing for all rebuild/cron operations to avoid serverless timeouts.
> **Rule 3: Salt Separation.** Never expose experiment salts to the browser bundle via public environment variables.
