import {
  CC_MIN_DUE_INCOME_STRESS_RATIO,
  MICRO_UPI_MIN_COUNT,
  MICRO_UPI_MIN_DEBIT_SHARE,
  MICRO_UPI_MIN_TOTAL_PAISA,
  REPEAT_MERCHANT_MIN_COUNT,
  REPEAT_MERCHANT_MIN_TOTAL_PAISA,
} from '@/lib/bad-pattern-signals';
import type { CategorySummary } from './categorizer';
import type { StatementType } from './statements';

export type AdvisorySeverity = 'info' | 'warning' | 'critical';

/** Deep link preset for P4-E bad-pattern cards (Transactions tab). */
export type AdvisoryCtaPreset = 'micro_upi' | 'merchant_key' | 'scope_only';

export interface Advisory {
  id: string;
  trigger: string;
  severity: AdvisorySeverity;
  headline: string;
  /** Rule-based body; always present as safe fallback when Gemini is off or fails. */
  message: string;
  amount_paisa?: number;
  /** Facts-grounded Gemini narrative (T4); UI prefers this over `message` when set. */
  narrative?: string;
  /** Layer A fact ids the narrative is tied to; drives Sources drawer. */
  cited_fact_ids?: string[];
  /** P4-E: optional CTA to scoped Transactions (bad-pattern tap-through). */
  cta?: { label: string; preset: AdvisoryCtaPreset; merchant_key?: string };
}

interface AdvisoryInput {
  statement_type: StatementType;
  summary: CategorySummary;
  perceived_spend_paisa: number;
  monthly_income_paisa: number;
  debt_load_paisa: number;
  food_delivery_paisa: number;
  subscription_paisa: number;
  payment_due_paisa: number | null;
  minimum_due_paisa: number | null;
  micro_upi_debit_paisa: number;
  micro_upi_debit_count: number;
  repeat_merchant_key: string | null;
  repeat_merchant_debit_count: number;
  repeat_merchant_debit_paisa: number;
  has_credit_card_statement: boolean;
  cc_minimum_due_effective_paisa: number | null;
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
      headline: `₹${formatRupees(input.subscription_paisa)} in subscriptions this period`,
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
        message: `You spent ₹${formatRupees(input.food_delivery_paisa)} on Swiggy, Zomato, and restaurants this period. Review how much of this was genuine necessity vs convenience.`,
        amount_paisa: input.food_delivery_paisa,
      });
    }
  }

  // ── 4. NO_INVESTMENT ─────────────────────────────────────────────
  if (input.statement_type === 'bank_account' && summary.investment === 0) {
    advisories.push({
      id: 'no-investment',
      trigger: 'NO_INVESTMENT',
      severity: 'warning',
      headline: 'No investments detected in this period',
      message:
        'Your statement shows zero SIP, mutual fund, or recurring investment transactions. Even ₹500/month in an index fund compounds significantly over 10 years.',
    });
  }

  // ── 5. HIGH_DEBT_RATIO ───────────────────────────────────────────
  if (monthly_income_paisa > 0) {
    const debtRatio = (input.debt_load_paisa / monthly_income_paisa) * 100;
    if (debtRatio > 40) {
      advisories.push({
        id: 'high-debt',
        trigger: 'HIGH_DEBT_RATIO',
        severity: 'critical',
        headline: `${Math.round(debtRatio)}% of income goes to debt & EMIs`,
        message: `You're paying ₹${formatRupees(input.debt_load_paisa)} in EMIs, BNPL, and credit card dues. Anything above 40% of income is a red flag — consider consolidating or paying off high-interest debt first.`,
        amount_paisa: input.debt_load_paisa,
      });
    }
  }

  // ── 6. HIGH_OTHER_BUCKET — uncategorized / opaque spend ─────────
  if (summary.total_debits > 0) {
    const otherPct = (summary.other / summary.total_debits) * 100;
    if (otherPct >= 35 && summary.total_debits >= 500_000) {
      advisories.push({
        id: 'high-other',
        trigger: 'HIGH_OTHER_BUCKET',
        severity: otherPct >= 50 ? 'warning' : 'info',
        headline: `${Math.round(otherPct)}% of spending is "Other"`,
        message: `₹${formatRupees(summary.other)} landed in uncategorized merchants (UPI labels, transfers, mixed narrations). Review these line items — some are likely discretionary or avoidable once you label them.`,
        amount_paisa: summary.other,
      });
    }
  }

  // ── 7. DISCRETIONARY_RATIO — wants + uncategorized bulk ─────────
  if (summary.total_debits > 0) {
    const discretionary = summary.wants + summary.other;
    const discPct = (discretionary / summary.total_debits) * 100;
    if (discPct >= 50 && summary.total_debits >= 300_000) {
      advisories.push({
        id: 'discretionary-heavy',
        trigger: 'DISCRETIONARY_RATIO',
        severity: discPct >= 65 ? 'warning' : 'info',
        headline: `~${Math.round(discPct)}% is wants + uncategorized`,
        message: `Wants and "Other" together are ₹${formatRupees(discretionary)}. That's the main pool to cut if you need to free up cash — start with subscriptions, impulse UPI, and food delivery.`,
        amount_paisa: discretionary,
      });
    }
  }

  // ── 8. AVOIDABLE_SPEND_PROXY — explicit "what to review" ────────
  if (summary.total_debits > 0) {
    const avoidable = summary.wants + Math.round(summary.other * 0.5);
    const avoidPct = (avoidable / summary.total_debits) * 100;
    if (avoidPct >= 30 && summary.wants + summary.other >= 500_000) {
      advisories.push({
        id: 'avoidable-spend',
        trigger: 'AVOIDABLE_SPEND',
        severity: 'info',
        headline: `Roughly ₹${formatRupees(avoidable)} may be trimmable`,
        message:
          'This blends clear "wants" with half of uncategorized spend as a conservative guess — not exact, but a starting point to find unnecessary expenses. Cross-check "Other" before cutting.',
        amount_paisa: avoidable,
      });
    }
  }

  // ── 9. CC_REVOLVING_RISK — minimum due vs statement balance ─────
  const payDue = input.payment_due_paisa;
  const minDue = input.minimum_due_paisa;
  if (
    input.statement_type === 'credit_card' &&
    payDue !== null &&
    minDue !== null &&
    payDue > 0 &&
    minDue > 0 &&
    minDue < payDue
  ) {
    const minShare = minDue / payDue;
    if (minShare <= 0.2) {
      advisories.push({
        id: 'cc-revolving',
        trigger: 'CC_REVOLVING_RISK',
        severity: 'warning',
        headline: 'Minimum due is only a small slice of total due',
        message: `Your minimum due is ₹${formatRupees(minDue)} on a statement balance of ₹${formatRupees(payDue)}. Paying only the minimum racks up interest on the rest — plan full or higher payments when you can.`,
        amount_paisa: payDue - minDue,
      });
    }
  }

  // ── 10. MICRO_UPI_DRAIN (P4-E) — many small UPI debits ──────────
  if (summary.total_debits > 0) {
    const micro = input.micro_upi_debit_paisa;
    const microCount = input.micro_upi_debit_count;
    const share = micro / summary.total_debits;
    const fire =
      micro >= MICRO_UPI_MIN_TOTAL_PAISA ||
      microCount >= MICRO_UPI_MIN_COUNT ||
      share >= MICRO_UPI_MIN_DEBIT_SHARE;
    if (fire) {
      advisories.push({
        id: 'micro-upi-drain',
        trigger: 'MICRO_UPI_DRAIN',
        severity: share >= 0.2 || microCount >= 25 ? 'warning' : 'info',
        headline: `₹${formatRupees(micro)} in small UPI payments (${microCount} txns)`,
        message: `About ${Math.round(share * 100)}% of your debits are UPI payments of ₹500 or less. Small taps add up — review whether each was intentional.`,
        amount_paisa: micro,
        cited_fact_ids: ['micro_upi_debit_paisa'],
        cta: { label: 'Review transactions', preset: 'micro_upi' },
      });
    }
  }

  // ── 11. REPEAT_MERCHANT_NOISE (P4-E) — same merchant, many debits ─
  const rptKey = input.repeat_merchant_key;
  if (
    rptKey &&
    input.repeat_merchant_debit_count >= REPEAT_MERCHANT_MIN_COUNT &&
    input.repeat_merchant_debit_paisa >= REPEAT_MERCHANT_MIN_TOTAL_PAISA
  ) {
    advisories.push({
      id: 'repeat-merchant-noise',
      trigger: 'REPEAT_MERCHANT_NOISE',
      severity: input.repeat_merchant_debit_count >= 8 ? 'warning' : 'info',
      headline: `${input.repeat_merchant_debit_count} debits to the same merchant`,
      message: `You paid ₹${formatRupees(input.repeat_merchant_debit_paisa)} across ${input.repeat_merchant_debit_count} transactions to one normalized merchant bucket in this scope. Worth a quick pass for duplicates or impulse repeats.`,
      amount_paisa: input.repeat_merchant_debit_paisa,
      cited_fact_ids: ['repeat_merchant_noise_paisa'],
      cta: {
        label: 'Review transactions',
        preset: 'merchant_key',
        merchant_key: rptKey,
      },
    });
  }

  // ── 12. CC_MIN_DUE_INCOME_STRESS (P4-E) — min due vs income ─────
  const ccMinEff = input.cc_minimum_due_effective_paisa;
  if (
    input.has_credit_card_statement &&
    monthly_income_paisa > 0 &&
    ccMinEff !== null &&
    ccMinEff > 0
  ) {
    const ratio = ccMinEff / monthly_income_paisa;
    if (ratio > CC_MIN_DUE_INCOME_STRESS_RATIO) {
      advisories.push({
        id: 'cc-min-due-income-stress',
        trigger: 'CC_MIN_DUE_INCOME_STRESS',
        severity: ratio > 0.3 ? 'warning' : 'info',
        headline: `Minimum due is ${Math.round(ratio * 100)}% of your stated income`,
        message: `Credit card minimum due is ₹${formatRupees(ccMinEff)} vs ₹${formatRupees(monthly_income_paisa)} monthly income (onboarding). Paying only the minimum extends costly balances — prioritize clearing high-APR portions when you can.`,
        amount_paisa: ccMinEff,
        cited_fact_ids: ['cc_minimum_due_income_ratio'],
        cta: { label: 'Review transactions', preset: 'scope_only' },
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

function formatRupees(paisa: number): string {
  const rupees = Math.round(paisa / 100);
  return rupees.toLocaleString('en-IN');
}
