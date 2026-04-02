/**
 * T9 — Advisory Engine
 *
 * Generates 5 types of financial advisory cards based on the
 * user's actual transaction data (post bank-statement-parse).
 *
 * Triggers:
 *   1. PERCEPTION_GAP — comparing perceived vs actual spend
 *   2. SUBSCRIPTION_LEAK — recurring wants > ₹2,000/month
 *   3. FOOD_DELIVERY — dining/food delivery > 15% of debits
 *   4. NO_INVESTMENT — zero SIP/MF transactions detected
 *   5. HIGH_DEBT_RATIO — debt payments > 40% of income
 *
 * Each advisory has a severity (info | warning | critical),
 * a headline, and a detailed message.
 */

import type { CategorySummary } from './categorizer';

export type AdvisorySeverity = 'info' | 'warning' | 'critical';

export interface Advisory {
  id: string;
  trigger: string;
  severity: AdvisorySeverity;
  headline: string;
  message: string;
  amount_paisa?: number;
}

interface AdvisoryInput {
  summary: CategorySummary;
  perceived_spend_paisa: number;
  monthly_income_paisa: number;
  food_delivery_paisa: number;
  subscription_paisa: number;
}

/**
 * Generate advisory feed items from parsed statement data.
 * Returns advisories sorted by severity (critical first).
 */
export function generateAdvisories(input: AdvisoryInput): Advisory[] {
  const advisories: Advisory[] = [];
  const { summary, perceived_spend_paisa, monthly_income_paisa } = input;

  // ── 1. PERCEPTION_GAP ────────────────────────────────────────────
  if (perceived_spend_paisa > 0 && summary.total_debits > 0) {
    const gap = summary.total_debits - perceived_spend_paisa;
    const gapPct = Math.round((gap / perceived_spend_paisa) * 100);

    if (gapPct > 10) {
      const severity: AdvisorySeverity =
        gapPct > 40 ? 'critical' : gapPct > 20 ? 'warning' : 'info';

      advisories.push({
        id: 'perception-gap',
        trigger: 'PERCEPTION_GAP',
        severity,
        headline: `You spent ${gapPct}% more than you thought`,
        message: `You estimated ₹${formatRupees(perceived_spend_paisa)} per month, but your bank statement shows ₹${formatRupees(summary.total_debits)}. That's ₹${formatRupees(gap)} you didn't account for.`,
        amount_paisa: gap,
      });
    }
  }

  // ── 2. SUBSCRIPTION_LEAK ─────────────────────────────────────────
  if (input.subscription_paisa > 200000) {
    // > ₹2,000/month
    advisories.push({
      id: 'subscription-leak',
      trigger: 'SUBSCRIPTION_LEAK',
      severity: input.subscription_paisa > 500000 ? 'warning' : 'info',
      headline: `₹${formatRupees(input.subscription_paisa)}/mo in subscriptions`,
      message:
        'Netflix, Spotify, YouTube Premium, gym membership — they feel small individually but compound fast. Are you actively using all of them?',
      amount_paisa: input.subscription_paisa,
    });
  }

  // ── 3. FOOD_DELIVERY ─────────────────────────────────────────────
  if (summary.total_debits > 0) {
    const foodPct = (input.food_delivery_paisa / summary.total_debits) * 100;
    if (foodPct > 15) {
      advisories.push({
        id: 'food-delivery',
        trigger: 'FOOD_DELIVERY',
        severity: foodPct > 25 ? 'critical' : 'warning',
        headline: `${Math.round(foodPct)}% of your spending is food delivery`,
        message: `You spent ₹${formatRupees(input.food_delivery_paisa)} on Swiggy, Zomato, and restaurants. That's ₹${formatRupees(input.food_delivery_paisa * 12)} per year just on convenience.`,
        amount_paisa: input.food_delivery_paisa,
      });
    }
  }

  // ── 4. NO_INVESTMENT ─────────────────────────────────────────────
  if (summary.investment === 0) {
    advisories.push({
      id: 'no-investment',
      trigger: 'NO_INVESTMENT',
      severity: 'warning',
      headline: 'No investments detected this month',
      message:
        'Your statement shows zero SIP, mutual fund, or recurring investment transactions. Even ₹500/month in an index fund compounds significantly over 10 years.',
    });
  }

  // ── 5. HIGH_DEBT_RATIO ───────────────────────────────────────────
  if (monthly_income_paisa > 0) {
    const debtRatio = (summary.debt / monthly_income_paisa) * 100;
    if (debtRatio > 40) {
      advisories.push({
        id: 'high-debt',
        trigger: 'HIGH_DEBT_RATIO',
        severity: 'critical',
        headline: `${Math.round(debtRatio)}% of income goes to debt & EMIs`,
        message: `You're paying ₹${formatRupees(summary.debt)} in EMIs, BNPL, and credit card dues. Anything above 40% of income is a red flag — consider consolidating or paying off high-interest debt first.`,
        amount_paisa: summary.debt,
      });
    }
  }

  // Sort: critical → warning → info
  const severityOrder: Record<AdvisorySeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  return advisories.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/**
 * Convert paisa to formatted rupees string (no currency symbol).
 * E.g. 1234500 → "12,345"
 */
function formatRupees(paisa: number): string {
  const rupees = Math.round(paisa / 100);
  return rupees.toLocaleString('en-IN');
}
