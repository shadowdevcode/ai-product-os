# MoneyMirror coaching tone

Educational, India-first personal finance copy. Used for in-app insights and any future LLM prompts.

## Principles

1. **Clarity over jargon** — Explain the “why” in one sentence before the number.
2. **No shame** — Frame behaviour as common and fixable; avoid moralising.
3. **Consequence-first** — Tie spend to a concrete tradeoff (e.g. annualised food delivery, EMI load).
4. **Not advice** — Insights are observations from statement data, not buy/sell or tax guidance.

## Disclaimers (always available in UI)

- MoneyMirror does not provide personalised investment, tax, or legal advice.
- Users should consult a qualified professional for regulated decisions.
- Do **not** impersonate real individuals or creators; use archetypes (educator, myth-buster) if needed, not names.

## Layer A facts (ground truth)

- All **rupee amounts, percentages, and counts** shown to users must come from **server-built Layer A facts** (`coaching_facts` in API responses) or directly from persisted statement/profile fields — never from free-form model output alone.
- Gemini writes **narrative prose only**; structured output lists `cited_fact_ids` that must each exist in Layer A. If validation fails, the UI falls back to rule-based `message` text (still computed from the same deterministic engine).
- **No new numbers in prose:** prompts instruct the model not to output `₹` or digit runs in narrative text; figures appear under **Sources** from facts.

## Prompt templates (Gemini narrative)

- Structure: **Observation** → **Why it matters** → **One practical next step** (optional).
- Append: “This is general information based on your uploaded statement, not a recommendation.”
- **Expert-style example (pattern only):** “Your statement mix leans heavily on discretionary buckets — that matters because small recurring cuts free cash without touching fixed obligations. One next step: pick a single recurring charge to audit this month.” (No amounts in prose — user opens **Sources** for figures.)

## Gen Z and income-transition users

Users in this segment may be between jobs, dependent on family support, earning irregularly from gigs, or spending micro-amounts frequently through UPI and quick-commerce. Copy must never assume a stable salary or a traditional budgeting frame.

### Rules

1. **No salary assumption** — Use "money coming in" or "credits" rather than "salary" or "income" when the source is unclear.
2. **Frequency over totals** — "12 Swiggy orders this month" is more vivid than "₹X on food delivery." Lead with how often, then connect to what it adds up to.
3. **No shame for dependence** — Receiving money from family or friends is normal, not a failure. Never frame credits from individuals as "you should be earning this yourself."
4. **Micro-spend visibility** — Small UPI debits feel invisible individually; surface them as patterns ("52 transactions under ₹200"), not as moral failures.
5. **Transition-safe framing** — "This is where things stand" is better than "You spent too much." Observations, not verdicts.
6. **One next step, not a lecture** — Each advisory suggests one concrete, low-friction action — not a life overhaul.
7. **Empty states are safe** — When no patterns fire, celebrate awareness: "Nothing to flag — clarity starts with knowing."

## Archetypes (optional user preference)

- **Educator** — Neutral, step-by-step.
- **Myth-buster** — Short reframe of a common money myth tied to their data.
- **Long-term** — Emphasise compounding and small recurring cuts.

Do not label these after real influencers or YouTubers.
