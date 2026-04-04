import { describe, it, expect } from 'vitest';
import { calculateMoneyHealthScore, type OnboardingAnswers } from './scoring';

// Helper: build answers in paisa
const income = (rupees: number) => rupees * 100;
const spend = (rupees: number) => rupees * 100;

describe('calculateMoneyHealthScore', () => {
  it('gives max score to a financially disciplined user', () => {
    const answers: OnboardingAnswers = {
      monthly_income_paisa: income(80000),
      perceived_spend_paisa: spend(40000), // 50% savings rate
      has_emergency_fund: true,
      invests_in_sip: true,
      has_emi_or_bnpl: false,
    };
    const result = calculateMoneyHealthScore(answers);
    expect(result.score).toBe(100);
    expect(result.grade).toBe('A');
    expect(result.label).toBe('Financially Aware');
  });

  it('gives low score to user spending more than they earn', () => {
    const answers: OnboardingAnswers = {
      monthly_income_paisa: income(30000),
      perceived_spend_paisa: spend(35000), // negative savings
      has_emergency_fund: false,
      invests_in_sip: false,
      has_emi_or_bnpl: true,
    };
    const result = calculateMoneyHealthScore(answers);
    expect(result.score).toBeLessThan(20);
    expect(result.grade).toBe('F');
    expect(result.perceived_gap_pct).toBeGreaterThan(60);
  });

  it('awards 25 pts for emergency fund', () => {
    const base: OnboardingAnswers = {
      monthly_income_paisa: income(50000),
      perceived_spend_paisa: spend(50000), // 0% savings = 5 pts
      has_emergency_fund: false,
      invests_in_sip: false,
      has_emi_or_bnpl: true, // 0 pts
    };
    const withFund = {
      ...base,
      has_emergency_fund: true,
    };
    const without = calculateMoneyHealthScore(base);
    const with_ = calculateMoneyHealthScore(withFund);
    expect(with_.score - without.score).toBe(25);
  });

  it('handles zero income gracefully (no division by zero)', () => {
    const answers: OnboardingAnswers = {
      monthly_income_paisa: 0,
      perceived_spend_paisa: spend(20000),
      has_emergency_fund: false,
      invests_in_sip: false,
      has_emi_or_bnpl: false,
    };
    const result = calculateMoneyHealthScore(answers);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('returns correct grade boundaries — B grade (60–79)', () => {
    // Spending 85% of income → savings rate ~15% → 18 pts
    // + emergency fund: 25 pts → total 43
    // + no EMI: 15 pts → total 58
    // + SIP: 20 pts → total 78 → grade B
    const bGradeAnswers: OnboardingAnswers = {
      monthly_income_paisa: income(50000),
      perceived_spend_paisa: spend(42500), // ~15% savings → 18 pts
      has_emergency_fund: true, // 25 pts → 43
      invests_in_sip: true, // 20 pts → 63
      has_emi_or_bnpl: false, // 15 pts → 78
    };
    const result = calculateMoneyHealthScore(bGradeAnswers);
    expect(result.grade).toBe('B');
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.score).toBeLessThan(80);
  });
});
