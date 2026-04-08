import { describe, expect, it } from 'vitest';
import { buildLayerAFacts, factIdsFromLayerA, validateCitedFactIds } from '@/lib/coaching-facts';
import type { DashboardData } from '@/lib/dashboard';

function minimalDashboard(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    statement_id: '00000000-0000-4000-8000-000000000001',
    institution_name: 'Test Bank',
    statement_type: 'bank_account',
    period_start: '2026-01-01',
    period_end: '2026-01-31',
    due_date: null,
    payment_due_paisa: null,
    minimum_due_paisa: null,
    credit_limit_paisa: null,
    perceived_spend_paisa: 100_000,
    monthly_income_paisa: 500_000,
    nickname: null,
    account_purpose: null,
    card_network: null,
    transaction_count: 3,
    summary: {
      needs_paisa: 50_000,
      wants_paisa: 30_000,
      investment_paisa: 0,
      debt_paisa: 20_000,
      other_paisa: 10_000,
      total_debits_paisa: 110_000,
      total_credits_paisa: 0,
    },
    signals: { food_delivery_paisa: 15_000, subscription_paisa: 5_000 },
    advisories: [],
    scope: {
      kind: 'single_statement',
      date_from: null,
      date_to: null,
      included_statement_ids: ['00000000-0000-4000-8000-000000000001'],
    },
    perceived_is_profile_baseline: true,
    plan: 'free',
    ...overrides,
  };
}

describe('buildLayerAFacts', () => {
  it('parses through Zod and includes core fact ids', () => {
    const facts = buildLayerAFacts(minimalDashboard());
    expect(facts.version).toBe(1);
    const ids = factIdsFromLayerA(facts);
    expect(ids.has('total_debits_paisa')).toBe(true);
    expect(ids.has('wants_paisa')).toBe(true);
    expect(ids.has('food_delivery_signal_paisa')).toBe(true);
  });

  it('adds credit-card facts when statement is credit_card', () => {
    const facts = buildLayerAFacts(
      minimalDashboard({
        statement_type: 'credit_card',
        payment_due_paisa: 50_000_00,
        minimum_due_paisa: 5_000_00,
      })
    );
    const ids = factIdsFromLayerA(facts);
    expect(ids.has('cc_payment_due_paisa')).toBe(true);
    expect(ids.has('cc_minimum_due_paisa')).toBe(true);
  });
});

describe('validateCitedFactIds', () => {
  it('rejects unknown ids', () => {
    const facts = buildLayerAFacts(minimalDashboard());
    const allowed = factIdsFromLayerA(facts);
    const v = validateCitedFactIds(['total_debits_paisa', 'nope'], allowed);
    expect(v.ok).toBe(false);
  });

  it('rejects empty citations', () => {
    const facts = buildLayerAFacts(minimalDashboard());
    const allowed = factIdsFromLayerA(facts);
    const v = validateCitedFactIds([], allowed);
    expect(v.ok).toBe(false);
  });

  it('accepts non-empty subset', () => {
    const facts = buildLayerAFacts(minimalDashboard());
    const allowed = factIdsFromLayerA(facts);
    const v = validateCitedFactIds(['total_debits_paisa'], allowed);
    expect(v.ok).toBe(true);
  });
});
