# ozi-insights

Customer insight layer for the Ozi app. This workspace holds synthetic support data grounded in real Play Store signal, to be used as input for a structured analysis pass.

---

## What's Here

```
apps/ozi-insights/
  data/
    freshdesk-synthetic.json    ← 30 synthetic Freshdesk tickets (raw data only)
  README.md
```

---

## Why This Exists

Ozi's Play Store reviews (3.9★, 85 reviews, 18×1★) surfaced 8 recurring pain point categories. Rather than jumping straight to solutions, this dataset simulates what Ozi's Freshdesk inbox would look like — realistic customer support transcripts grounded in those pain points.

**Design principle:** The data is raw. No categories are injected into the conversations. A future analysis pass reads this file cold and must discover patterns programmatically, the same way a real support analyst would.

---

## Ticket Schema

Each object in `freshdesk-synthetic.json`:

```json
{
  "id": "TKT-001",
  "subject": "...",
  "status": "open | pending | resolved | closed",
  "priority": "low | medium | high | urgent",
  "created_at": "ISO 8601 with +05:30 offset",
  "updated_at": "ISO 8601 with +05:30 offset",
  "resolved_at": "ISO 8601 | null",
  "resolution_time_minutes": 136,
  "csat_score": 1,
  "tags": ["delivery-delay", "sla-breach"],
  "category": "delivery-delay",
  "channel": "chat | email | phone",
  "requester": {
    "name": "Priya Sharma",
    "location": "Gurgaon | Noida | Delhi | Mumbai"
  },
  "conversation": [
    {
      "role": "customer | agent",
      "body": "...",
      "timestamp": "ISO 8601 with +05:30 offset"
    }
  ]
}
```

### Field Notes

| Field | Notes |
|-------|-------|
| `status` | `open` = active/unresolved. `pending` = waiting on customer/internal. `resolved` = closed with action. `closed` = auto-closed or no-action |
| `resolved_at` | `null` for ghost-support tickets and unresolved cases |
| `resolution_time_minutes` | `null` when unresolved. Values >1440 indicate next-day+ resolution |
| `csat_score` | 1–5. `null` when not rated (open tickets, or customer did not rate) |
| `tags` | Multi-label. One ticket can have `delivery-delay` + `support-ghost` together |
| `category` | Single primary category — the dominant pain point |

---

## Pain Point Categories

| Category Tag | Description | Ticket Count |
|-------------|-------------|-------------|
| `delivery-delay` | Order arrived significantly later than the 30-min SLA | 10 |
| `support-ghost` | Agent went unresponsive mid-conversation or ticket closed without resolution | 7 |
| `wrong-product` | Incorrect, defective, used, or misrepresented product delivered | 5 |
| `no-cancellation` | Customer wanted to cancel but found no self-serve option in the app | 3 |
| `serviceability` | Customer in unsupported city (Delhi, Mumbai) misled by app UX | 2 |
| `pricing` | Product perceived as too expensive vs offline alternatives | 2 |
| `app-bug` | Feature crash (demo booking) with cascading ops failure | 1 |

---

## Realism Signals to Note

- **Hinglish in conversations**: Tickets 026, 029, and others include Hindi-English mix, authentic for Delhi NCR parent demographic
- **Ghost-support pattern**: TKT-004, 012, 013, 025 — agent responds then conversation ends with no follow-up, status remains `open`
- **Escalating frustration**: TKT-003, 010, 015 — customer tone degrades across messages as resolution stalls
- **Broken promises**: TKT-005 (overnight delivery + no sorry coupon), TKT-030 (no-show after manual booking) — compound failures
- **CSAT distribution**: Not all 1s. Scores range 1–4 based on resolution quality. Some tickets have `null` CSAT (unresolved or not rated)

---

## What the Analysis Pass Should Compute

When this dataset is fed into an analysis script:

1. **Frequency by category** — which issue type appears most?
2. **Average CSAT by category** — which issue creates most dissatisfaction?
3. **Resolution rate by category** — % of tickets that are `resolved | closed` vs `open | pending`
4. **Average resolution time by category** — where is the operational lag worst?
5. **Co-occurrence of tags** — e.g. `delivery-delay` + `support-ghost` together signals a compounding failure mode
6. **Ghost rate** — % of tickets with `resolved_at: null` and last message from `customer`

Each category that scores high across multiple metrics becomes an experiment candidate, which then maps to an MVP spec for engineers.

---

## Source Signal

**App:** OZi: Fast. Trusted. For Kids. (`com.ozi.user`)
**Reviews scraped:** March 21, 2026
**Rating at time of scrape:** 3.9★ overall, 85 reviews — 57×5★ / 5×4★ / 3×3★ / 2×2★ / 18×1★
**Coverage:** Gurgaon and Noida only (as of March 2026)
