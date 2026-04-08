import { describe, expect, it } from 'vitest';
import {
  CC_MIN_DUE_INCOME_STRESS_RATIO,
  MICRO_UPI_MIN_TOTAL_PAISA,
  REPEAT_MERCHANT_MIN_COUNT,
  REPEAT_MERCHANT_MIN_TOTAL_PAISA,
} from '@/lib/bad-pattern-signals';
import { generateAdvisories } from '@/lib/advisory-engine';

const baseP4E = {
  micro_upi_debit_paisa: 0,
  micro_upi_debit_count: 0,
  repeat_merchant_key: null as string | null,
  repeat_merchant_debit_count: 0,
  repeat_merchant_debit_paisa: 0,
  has_credit_card_statement: false,
  cc_minimum_due_effective_paisa: null as number | null,
};

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
      ...baseP4E,
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
      ...baseP4E,
    });

    expect(advisories.some((advisory) => advisory.trigger === 'HIGH_DEBT_RATIO')).toBe(true);
  });

  it('emits MICRO_UPI_DRAIN when micro-UPI total crosses threshold', () => {
    const advisories = generateAdvisories({
      statement_type: 'bank_account',
      summary: {
        needs: 0,
        wants: 0,
        investment: 0,
        debt: 0,
        other: 0,
        total_debits: 500000,
        total_credits: 0,
      },
      perceived_spend_paisa: 0,
      monthly_income_paisa: 5000000,
      debt_load_paisa: 0,
      food_delivery_paisa: 0,
      subscription_paisa: 0,
      payment_due_paisa: null,
      minimum_due_paisa: null,
      ...baseP4E,
      micro_upi_debit_paisa: MICRO_UPI_MIN_TOTAL_PAISA,
      micro_upi_debit_count: 3,
    });

    expect(advisories.some((a) => a.trigger === 'MICRO_UPI_DRAIN')).toBe(true);
    const card = advisories.find((a) => a.trigger === 'MICRO_UPI_DRAIN');
    expect(card?.cta?.preset).toBe('micro_upi');
  });

  it('emits REPEAT_MERCHANT_NOISE when same merchant has many debits', () => {
    const advisories = generateAdvisories({
      statement_type: 'bank_account',
      summary: {
        needs: 0,
        wants: 0,
        investment: 0,
        debt: 0,
        other: 0,
        total_debits: 800000,
        total_credits: 0,
      },
      perceived_spend_paisa: 0,
      monthly_income_paisa: 5000000,
      debt_load_paisa: 0,
      food_delivery_paisa: 0,
      subscription_paisa: 0,
      payment_due_paisa: null,
      minimum_due_paisa: null,
      ...baseP4E,
      repeat_merchant_key: 'swiggy_india',
      repeat_merchant_debit_count: REPEAT_MERCHANT_MIN_COUNT,
      repeat_merchant_debit_paisa: REPEAT_MERCHANT_MIN_TOTAL_PAISA,
    });

    expect(advisories.some((a) => a.trigger === 'REPEAT_MERCHANT_NOISE')).toBe(true);
    expect(advisories.find((a) => a.trigger === 'REPEAT_MERCHANT_NOISE')?.cta?.merchant_key).toBe(
      'swiggy_india'
    );
  });

  it('emits CC_MIN_DUE_INCOME_STRESS when minimum due is high vs income', () => {
    const income = 1_000_000;
    const minDue = Math.floor(income * (CC_MIN_DUE_INCOME_STRESS_RATIO + 0.05));
    const advisories = generateAdvisories({
      statement_type: 'credit_card',
      summary: {
        needs: 0,
        wants: 0,
        investment: 0,
        debt: 0,
        other: 0,
        total_debits: 100000,
        total_credits: 0,
      },
      perceived_spend_paisa: 0,
      monthly_income_paisa: income,
      debt_load_paisa: 0,
      food_delivery_paisa: 0,
      subscription_paisa: 0,
      payment_due_paisa: null,
      minimum_due_paisa: minDue,
      micro_upi_debit_paisa: 0,
      micro_upi_debit_count: 0,
      repeat_merchant_key: null,
      repeat_merchant_debit_count: 0,
      repeat_merchant_debit_paisa: 0,
      has_credit_card_statement: true,
      cc_minimum_due_effective_paisa: minDue,
    });

    expect(advisories.some((a) => a.trigger === 'CC_MIN_DUE_INCOME_STRESS')).toBe(true);
    expect(advisories.find((a) => a.trigger === 'CC_MIN_DUE_INCOME_STRESS')?.cta?.preset).toBe(
      'scope_only'
    );
  });
});
