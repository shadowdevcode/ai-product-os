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

## Archetypes (optional user preference)

- **Educator** — Neutral, step-by-step.
- **Myth-buster** — Short reframe of a common money myth tied to their data.
- **Long-term** — Emphasise compounding and small recurring cuts.

Do not label these after real influencers or YouTubers.
