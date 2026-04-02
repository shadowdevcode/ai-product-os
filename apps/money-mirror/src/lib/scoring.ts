/**
 * MoneyMirror — Money Health Score Algorithm
 *
 * Produces a score (0–100) from the 5-question onboarding flow.
 * The score is used as the "mirror trigger" — a low score motivates
 * the user to upload their bank statement and see the reality.
 *
 * Scoring philosophy (Warikoo-style):
 * - Savings rate is the single most predictive factor
 * - Emergency fund absence is an immediate red flag
 * - Investment behavior and debt awareness are secondary signals
 *
 * All monetary values are in PAISA to avoid floating-point errors.
 */

export interface OnboardingAnswers {
  /** Monthly take-home salary in paisa */
  monthly_income_paisa: number;
  /** Estimated monthly spend in paisa (perceived) */
  perceived_spend_paisa: number;
  /** Whether they have 3+ months of emergency fund */
  has_emergency_fund: boolean;
  /** Whether they invest in mutual funds or SIP */
  invests_in_sip: boolean;
  /** Whether they have any active EMI or BNPL */
  has_emi_or_bnpl: boolean;
}

export interface MoneyHealthScore {
  score: number; // 0–100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  label: string; // Human-readable label
  perceived_gap_pct: number; // Likely perception gap % (0–100)
}

/**
 * Calculate the Money Health Score.
 *
 * Breakdown (100 pts):
 *   40 pts — Savings rate (perceived_spend vs income)
 *   25 pts — Emergency fund presence
 *   20 pts — Active SIP investment
 *   15 pts — No active debt / BNPL
 */
export function calculateMoneyHealthScore(answers: OnboardingAnswers): MoneyHealthScore {
  let score = 0;

  // ─── 1. Savings rate (40 points) ─────────────────────────
  const savingsRate =
    answers.monthly_income_paisa > 0
      ? Math.max(0, 1 - answers.perceived_spend_paisa / answers.monthly_income_paisa)
      : 0;

  if (savingsRate >= 0.3) score += 40;
  else if (savingsRate >= 0.2) score += 30;
  else if (savingsRate >= 0.1) score += 18;
  else score += 5;

  // ─── 2. Emergency fund (25 points) ───────────────────────
  if (answers.has_emergency_fund) score += 25;

  // ─── 3. SIP investment (20 points) ───────────────────────
  if (answers.invests_in_sip) score += 20;

  // ─── 4. No debt / BNPL (15 points) ───────────────────────
  if (!answers.has_emi_or_bnpl) score += 15;

  // ─── Grade ────────────────────────────────────────────────
  const grade = scoreToGrade(score);
  const label = gradeToLabel(grade);

  // ─── Perception Gap Estimate ──────────────────────────────
  // The lower the score, the higher the likely gap.
  // This is an estimate to set expectations before the PDF upload.
  const perceived_gap_pct = Math.round(Math.max(0, 80 - score * 0.6));

  return { score, grade, label, perceived_gap_pct };
}

function scoreToGrade(score: number): MoneyHealthScore['grade'] {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

function gradeToLabel(grade: MoneyHealthScore['grade']): string {
  const labels: Record<MoneyHealthScore['grade'], string> = {
    A: 'Financially Aware',
    B: 'Getting There',
    C: 'Reality Check Needed',
    D: 'Leaking Money',
    F: 'Financial Blind Spot',
  };
  return labels[grade];
}
