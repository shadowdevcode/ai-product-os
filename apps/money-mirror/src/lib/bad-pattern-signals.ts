/**
 * Deterministic thresholds for P4-E bad-pattern advisories (issue-011).
 * Amounts are in paisa (e.g. 50000 = ₹500).
 */

/** Debits with UPI handle and amount at or below this are "micro" UPI. */
export const MICRO_UPI_MAX_AMOUNT_PAISA = 50_000;

/** Fire micro-UPI advisory when small-UPI debits sum to at least this much. */
export const MICRO_UPI_MIN_TOTAL_PAISA = 150_000;

/** Or when at least this many micro-UPI debit rows exist. */
export const MICRO_UPI_MIN_COUNT = 15;

/** Or when micro-UPI debits exceed this share of total debits (0–1). */
export const MICRO_UPI_MIN_DEBIT_SHARE = 0.12;

/** Repeat-merchant noise: minimum debit transactions to same merchant_key. */
export const REPEAT_MERCHANT_MIN_COUNT = 4;

/** And at least this much total debit volume to that merchant (paisa). */
export const REPEAT_MERCHANT_MIN_TOTAL_PAISA = 100_000;

/** CC: flag when minimum due exceeds this fraction of stated monthly income. */
export const CC_MIN_DUE_INCOME_STRESS_RATIO = 0.15;
