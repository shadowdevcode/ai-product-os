import { describe, it, expect } from 'vitest';
import {
  getClusterForMerchant,
  getClusterDefinition,
  buildClusterRollups,
  CLUSTERS,
} from '../merchant-clusters';

describe('getClusterForMerchant', () => {
  it('maps known quick-commerce keys', () => {
    expect(getClusterForMerchant('blinkit')).toBe('quick_commerce');
    expect(getClusterForMerchant('instamart')).toBe('quick_commerce');
    expect(getClusterForMerchant('zepto')).toBe('quick_commerce');
  });

  it('maps known food-delivery keys', () => {
    expect(getClusterForMerchant('zomato')).toBe('food_delivery');
    expect(getClusterForMerchant('swiggy')).toBe('food_delivery');
  });

  it('maps entertainment keys', () => {
    expect(getClusterForMerchant('netflix')).toBe('entertainment');
    expect(getClusterForMerchant('spotify')).toBe('entertainment');
    expect(getClusterForMerchant('youtube')).toBe('entertainment');
  });

  it('maps transport keys', () => {
    expect(getClusterForMerchant('uber')).toBe('transport');
    expect(getClusterForMerchant('ola')).toBe('transport');
  });

  it('maps shopping keys', () => {
    expect(getClusterForMerchant('amazon')).toBe('shopping');
    expect(getClusterForMerchant('flipkart')).toBe('shopping');
  });

  it('returns null for unknown merchants', () => {
    expect(getClusterForMerchant('some_random_shop')).toBeNull();
    expect(getClusterForMerchant('hdfc')).toBeNull();
    expect(getClusterForMerchant('')).toBeNull();
  });
});

describe('getClusterDefinition', () => {
  it('returns definition for valid cluster id', () => {
    const def = getClusterDefinition('quick_commerce');
    expect(def).toBeDefined();
    expect(def?.label).toBe('Quick commerce');
  });

  it('returns undefined for unknown cluster', () => {
    expect(getClusterDefinition('nonexistent')).toBeUndefined();
  });
});

describe('CLUSTERS', () => {
  it('has at least two clusters defined', () => {
    expect(CLUSTERS.length).toBeGreaterThanOrEqual(2);
  });

  it('each cluster has required fields', () => {
    for (const c of CLUSTERS) {
      expect(c.id).toBeTruthy();
      expect(c.label).toBeTruthy();
      expect(c.description).toBeTruthy();
    }
  });
});

describe('buildClusterRollups', () => {
  it('groups merchants by cluster', () => {
    const rows = [
      { merchant_key: 'blinkit', debit_paisa: 50000, debit_count: 5 },
      { merchant_key: 'instamart', debit_paisa: 30000, debit_count: 3 },
      { merchant_key: 'zomato', debit_paisa: 80000, debit_count: 10 },
    ];
    const rollups = buildClusterRollups(rows);
    expect(rollups).toHaveLength(2);

    const qc = rollups.find((r) => r.cluster.id === 'quick_commerce');
    expect(qc).toBeDefined();
    expect(qc!.totalDebitPaisa).toBe(80000);
    expect(qc!.debitCount).toBe(8);
    expect(qc!.merchantKeys).toEqual(['blinkit', 'instamart']);

    const fd = rollups.find((r) => r.cluster.id === 'food_delivery');
    expect(fd).toBeDefined();
    expect(fd!.totalDebitPaisa).toBe(80000);
    expect(fd!.debitCount).toBe(10);
  });

  it('excludes merchants with no cluster', () => {
    const rows = [
      { merchant_key: 'hdfc', debit_paisa: 100000, debit_count: 1 },
      { merchant_key: 'blinkit', debit_paisa: 20000, debit_count: 2 },
    ];
    const rollups = buildClusterRollups(rows);
    expect(rollups).toHaveLength(1);
    expect(rollups[0].cluster.id).toBe('quick_commerce');
  });

  it('returns empty array when no merchants match clusters', () => {
    const rows = [{ merchant_key: 'hdfc', debit_paisa: 100000, debit_count: 1 }];
    expect(buildClusterRollups(rows)).toEqual([]);
  });

  it('sorts by debit_count descending', () => {
    const rows = [
      { merchant_key: 'netflix', debit_paisa: 10000, debit_count: 1 },
      { merchant_key: 'zomato', debit_paisa: 80000, debit_count: 20 },
      { merchant_key: 'uber', debit_paisa: 50000, debit_count: 10 },
    ];
    const rollups = buildClusterRollups(rows);
    expect(rollups[0].cluster.id).toBe('food_delivery');
    expect(rollups[1].cluster.id).toBe('transport');
    expect(rollups[2].cluster.id).toBe('entertainment');
  });
});
