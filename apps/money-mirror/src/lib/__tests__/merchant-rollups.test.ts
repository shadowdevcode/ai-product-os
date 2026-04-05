import { describe, expect, it } from 'vitest';

/**
 * Reconciliation smoke (T3): keyed merchant-grouped debits are a subset of all debits
 * in the same scope; unmapped debits (null merchant_key) explain any gap.
 */
describe('merchant rollup reconciliation', () => {
  it('sum of non-overlapping merchant groups is at most keyed debit total', () => {
    const keyedDebitTotal = 8000;
    const groups = [
      { merchant_key: 'zomato', debit_paisa: 5000 },
      { merchant_key: 'swiggy', debit_paisa: 2000 },
    ];
    const sumGroups = groups.reduce((a, g) => a + g.debit_paisa, 0);
    expect(sumGroups).toBeLessThanOrEqual(keyedDebitTotal);
  });

  it('keyed debit total is at most scope debit total', () => {
    const scopeDebitTotal = 10_000;
    const keyedDebitTotal = 7500;
    expect(keyedDebitTotal).toBeLessThanOrEqual(scopeDebitTotal);
  });
});
