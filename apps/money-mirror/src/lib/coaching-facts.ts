import { z } from 'zod';
import type { DashboardData } from '@/lib/dashboard';

/**
 * Layer A — server-only facts JSON for facts-grounded coaching (issue-010 T4).
 * All currency values are paisa (BIGINT-safe integers). Display strings are pre-formatted for UI + Gemini prompts.
 */

export const coachingFactRowSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** Canonical amount in paisa when this fact is monetary */
  value_paisa: z.number().int().optional(),
  /** Pre-formatted for India locale, e.g. ₹12,345 */
  display_inr: z.string().min(1),
  /** Optional second line for ratios / context */
  detail: z.string().optional(),
});

export type CoachingFactRow = z.infer<typeof coachingFactRowSchema>;

export const layerAFactsSchema = z.object({
  version: z.literal(1),
  generated_at: z.string(),
  scope: z.object({
    kind: z.enum(['single_statement', 'unified']),
    date_from: z.string().nullable(),
    date_to: z.string().nullable(),
    included_statement_ids: z.array(z.string()),
  }),
  statement_type: z.enum(['bank_account', 'credit_card']),
  facts: z.array(coachingFactRowSchema),
});

export type LayerAFacts = z.infer<typeof layerAFactsSchema>;

function inr(paisa: number): string {
  const rupees = Math.round(paisa / 100);
  return `₹${rupees.toLocaleString('en-IN')}`;
}

function pct(part: number, whole: number): string {
  if (whole <= 0) {
    return '0%';
  }
  return `${Math.round((part / whole) * 100)}%`;
}

/**
 * Build Layer A facts from dashboard data (DB-derived + deterministic server math only).
 */
export function buildLayerAFacts(dashboard: DashboardData): LayerAFacts {
  const s = dashboard.summary;
  const signals = dashboard.signals;
  const perceived = dashboard.perceived_spend_paisa;
  const income = dashboard.monthly_income_paisa;
  const rows: CoachingFactRow[] = [];

  const push = (row: CoachingFactRow) => {
    rows.push(coachingFactRowSchema.parse(row));
  };

  push({
    id: 'total_debits_paisa',
    label: 'Total debits in scope',
    value_paisa: s.total_debits_paisa,
    display_inr: inr(s.total_debits_paisa),
  });

  push({
    id: 'perceived_spend_paisa',
    label: 'Perceived monthly spend (baseline)',
    value_paisa: perceived,
    display_inr: inr(perceived),
  });

  push({
    id: 'monthly_income_paisa',
    label: 'Monthly income (onboarding)',
    value_paisa: income,
    display_inr: inr(income),
  });

  if (perceived > 0 && s.total_debits_paisa > 0) {
    const gap = s.total_debits_paisa - perceived;
    const gapPct = Math.round((gap / perceived) * 100);
    push({
      id: 'perception_gap_paisa',
      label: 'Gap (actual debits minus perceived)',
      value_paisa: gap,
      display_inr: inr(gap),
      detail: `${gapPct}% vs perceived`,
    });
  }

  push({
    id: 'needs_paisa',
    label: 'Needs',
    value_paisa: s.needs_paisa,
    display_inr: inr(s.needs_paisa),
    detail: pct(s.needs_paisa, s.total_debits_paisa) + ' of debits',
  });
  push({
    id: 'wants_paisa',
    label: 'Wants',
    value_paisa: s.wants_paisa,
    display_inr: inr(s.wants_paisa),
    detail: pct(s.wants_paisa, s.total_debits_paisa) + ' of debits',
  });
  push({
    id: 'investment_paisa',
    label: 'Investment',
    value_paisa: s.investment_paisa,
    display_inr: inr(s.investment_paisa),
  });
  push({
    id: 'debt_paisa',
    label: 'Debt / EMI',
    value_paisa: s.debt_paisa,
    display_inr: inr(s.debt_paisa),
  });
  push({
    id: 'other_paisa',
    label: 'Other / uncategorised',
    value_paisa: s.other_paisa,
    display_inr: inr(s.other_paisa),
    detail: pct(s.other_paisa, s.total_debits_paisa) + ' of debits',
  });

  push({
    id: 'food_delivery_signal_paisa',
    label: 'Food delivery & dining (heuristic)',
    value_paisa: signals.food_delivery_paisa,
    display_inr: inr(signals.food_delivery_paisa),
    detail: pct(signals.food_delivery_paisa, s.total_debits_paisa) + ' of debits',
  });

  push({
    id: 'subscription_signal_paisa',
    label: 'Subscription-like spend (heuristic)',
    value_paisa: signals.subscription_paisa,
    display_inr: inr(signals.subscription_paisa),
  });

  const discretionary = s.wants_paisa + s.other_paisa;
  push({
    id: 'discretionary_paisa',
    label: 'Wants + Other (discretionary pool)',
    value_paisa: discretionary,
    display_inr: inr(discretionary),
    detail: pct(discretionary, s.total_debits_paisa) + ' of debits',
  });

  if (s.total_debits_paisa > 0) {
    const avoidable = s.wants_paisa + Math.round(s.other_paisa * 0.5);
    push({
      id: 'avoidable_proxy_paisa',
      label: 'Avoidable spend proxy (wants + ½ Other)',
      value_paisa: avoidable,
      display_inr: inr(avoidable),
      detail: pct(avoidable, s.total_debits_paisa) + ' of debits',
    });
  }

  if (income > 0) {
    const debtRatio = (s.debt_paisa / income) * 100;
    push({
      id: 'debt_to_income_ratio_pct',
      label: 'Debt + EMI to income',
      display_inr: `${Math.round(debtRatio)}%`,
      detail: `${inr(s.debt_paisa)} vs ${inr(income)} income`,
    });
  }

  if (dashboard.statement_type === 'credit_card') {
    const pay = dashboard.payment_due_paisa;
    const min = dashboard.minimum_due_paisa;
    if (pay !== null && pay > 0) {
      push({
        id: 'cc_payment_due_paisa',
        label: 'Credit card statement balance due',
        value_paisa: pay,
        display_inr: inr(pay),
      });
    }
    if (min !== null && min > 0) {
      push({
        id: 'cc_minimum_due_paisa',
        label: 'Credit card minimum due',
        value_paisa: min,
        display_inr: inr(min),
      });
    }
    if (pay !== null && min !== null && pay > 0 && min > 0 && min < pay) {
      push({
        id: 'cc_min_share_of_balance',
        label: 'Minimum due as share of balance due',
        display_inr: pct(min, pay),
        detail: `${inr(min)} of ${inr(pay)}`,
      });
    }
  }

  return layerAFactsSchema.parse({
    version: 1,
    generated_at: new Date().toISOString(),
    scope: {
      kind: dashboard.scope.kind,
      date_from: dashboard.scope.date_from,
      date_to: dashboard.scope.date_to,
      included_statement_ids: dashboard.scope.included_statement_ids,
    },
    statement_type: dashboard.statement_type,
    facts: rows,
  });
}

export function factIdsFromLayerA(facts: LayerAFacts): Set<string> {
  return new Set(facts.facts.map((f) => f.id));
}

/** Validate Gemini citations are a non-empty subset of Layer A ids (when AI is used). */
export function validateCitedFactIds(
  cited: string[],
  allowed: Set<string>
): { ok: true } | { ok: false; invalid: string[] } {
  const invalid = cited.filter((id) => !allowed.has(id));
  if (invalid.length > 0) {
    return { ok: false, invalid };
  }
  if (cited.length === 0) {
    return { ok: false, invalid: ['<empty>'] };
  }
  return { ok: true };
}

export function serializeFactsForPrompt(facts: LayerAFacts): string {
  return JSON.stringify(
    facts.facts.map((f) => ({
      id: f.id,
      label: f.label,
      display_inr: f.display_inr,
      value_paisa: f.value_paisa,
      detail: f.detail,
    })),
    null,
    0
  );
}
