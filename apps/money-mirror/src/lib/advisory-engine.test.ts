import { describe, expect, it } from 'vitest';
import { generateAdvisories } from '@/lib/advisory-engine';

describe('generateAdvisories', () => {
  it('skips no-investment on credit-card statements', () => {
    const advisories = generateAdvisories({
      statement_type: 'credit_card',
      summary: {
        needs: 100000,
        wants: 200000,
        investment: 0,
        debt: 0,
        other: 0,
        total_debits: 300000,
        total_credits: 500000,
      },
      perceived_spend_paisa: 250000,
      monthly_income_paisa: 6000000,
      debt_load_paisa: 0,
      food_delivery_paisa: 0,
      subscription_paisa: 0,
      payment_due_paisa: null,
      minimum_due_paisa: null,
    });

    expect(advisories.some((advisory) => advisory.trigger === 'NO_INVESTMENT')).toBe(false);
  });

  it('uses debt_load_paisa for high-debt advisory math', () => {
    const advisories = generateAdvisories({
      statement_type: 'credit_card',
      summary: {
        needs: 0,
        wants: 300000,
        investment: 0,
        debt: 0,
        other: 0,
        total_debits: 300000,
        total_credits: 1500000,
      },
      perceived_spend_paisa: 250000,
      monthly_income_paisa: 1000000,
      debt_load_paisa: 500000,
      food_delivery_paisa: 0,
      subscription_paisa: 0,
      payment_due_paisa: null,
      minimum_due_paisa: null,
    });

    expect(advisories.some((advisory) => advisory.trigger === 'HIGH_DEBT_RATIO')).toBe(true);
  });
});
