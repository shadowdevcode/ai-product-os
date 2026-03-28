# Nykaa Personalisation — Cold Email Draft

> Copy-paste ready. Attach `nykaa-personalisation-deck.pdf` to the email.

---

## Email Version (Primary — send to hiring manager / Head of Product)

**Subject:** Audited Nykaa Fashion: 12 surfaces, 0 personalised — so I built a fix

---

Hi [Name],

I logged into Nykaa Fashion with 6 past orders and audited 12 discovery surfaces — homepage shelves, search, categories. Every single one showed me the same editorial grid as a guest. The nav renders my name, but my order history is never used for ranking.

Myntra, Purplle, and Sephora all have personalised discovery live today. Nykaa's own Netcore case study showed **43.5% click uplift** when personalisation was applied — the demand signal is already proven.

So I built what I think should exist: a "Picked for You" shelf and search re-ranking engine using 60% historical affinity + 40% in-session intent, with deterministic A/B testing, 10 telemetry events, and 500ms graceful degradation. End-to-end in 48 hours.

The most interesting thing I found during self-review: PostHog telemetry flushes in the API critical path added 200-500ms latency, which triggered the fallback — meaning test users were accidentally seeing the control experience. The experiment was silently corrupting itself.

I've attached a 14-slide deck with the full breakdown — hypothesis, architecture, scoring engine, issues found, and a production roadmap. Happy to walk through a live demo.

I'm applying for **PM - Personalisation**.

Best,
Vijay Sehgal
[Your LinkedIn URL]
GitHub: https://github.com/shadowdevcode/ai-product-os
Deck: [GitHub Pages URL — add after deployment]

---

## Short Version (LinkedIn DM — send to PMs / CTO / product leaders)

---

Hi [Name],

I audited Nykaa Fashion as a logged-in user — 12 discovery surfaces, zero personalised. So I built a working personalisation engine: affinity-weighted shelf + search re-ranking with A/B testing infrastructure.

14-slide deck attached / linked below. I'm applying for PM - Personalisation and would value your perspective.

[Deck link]
[GitHub link]

— Vijay

---

## Ultra-Short Version (Twitter DM / follow-up)

---

Built a personalisation engine for Nykaa Fashion after finding 0/12 discovery surfaces are personalised for logged-in users. Deck: [link]. Applying for PM - Personalisation.

---

## Who to Send To (Priority Order)

| Priority | Target                                                                            | Why                                                         | Channel                     |
| -------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------- |
| 1        | **PM hiring manager** (find on LinkedIn: "Nykaa product manager personalisation") | Direct decision-maker for this role                         | Email + LinkedIn DM         |
| 2        | **Rajesh Uppalapati** (CTO, ex-Amazon 20 yrs)                                     | Will appreciate A/B rigor + production engineering patterns | LinkedIn DM (short version) |
| 3        | **Adwaita Nayar** (Executive Director, Nykaa Fashion)                             | Fashion vertical lead, cares about product vision           | LinkedIn DM (short version) |
| 4        | **careers@nykaa.com** / careers portal                                            | Standard channel — always apply here too                    | Email (primary version)     |

## Sending Strategy

1. **Apply through the official portal first** — this is table stakes
2. **Send the primary email** to the PM hiring manager (with PDF attached)
3. **LinkedIn DM** the CTO and any PMs you can find working on discovery/personalisation (short version)
4. **Post on LinkedIn** (see PM-PORTFOLIO-KIT.md Part 5 for the full post draft) — Tuesday/Wednesday 9-10 AM IST for peak engagement
5. **Follow up** after 5 business days if no response — one line: "Following up on my Nykaa personalisation project — happy to demo anytime."

## What Makes This Email High-Conversion

- **Opens with THEIR problem**, not "I'm Vijay and I'm applying"
- **Uses their own data** (43.5% Netcore uplift) — shows you did homework
- **One sharp technical insight** (PostHog corrupting the experiment) — separates you from every PM who just writes specs
- **Specific scope** (48 hours, 14 slides) — shows execution speed
- **Low-friction CTA** — "deck attached + happy to demo" gives them two paths
- **Under 180 words** — scannable on mobile in 30 seconds
