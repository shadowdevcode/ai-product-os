import { describe, expect, it, vi } from 'vitest';
import {
  fetchClusterMerchantAggregates,
  fetchTopMerchantsByFrequency,
} from '@/lib/dashboard-helpers';

describe('dashboard-helpers', () => {
  it('filters frequency aggregation to debit transactions', async () => {
    const sql = vi.fn(async (strings: TemplateStringsArray) => {
      const query = strings.join('');
      expect(query).toContain("AND type = 'debit'");
      expect(query).not.toContain('amount_paisa > 0');
      return [{ merchant_key: 'zomato', debit_count: '2', debit_paisa: '4500' }];
    });

    const rows = await fetchTopMerchantsByFrequency(
      sql as never,
      'user-1',
      '2026-04-01',
      '2026-04-30',
      null
    );

    expect(rows).toEqual([{ merchant_key: 'zomato', debit_count: 2, debit_paisa: 4500 }]);
  });

  it('fetchClusterMerchantAggregates filters by ANY(merchantKeys) and applies no LIMIT', async () => {
    const sql = vi.fn(async (strings: TemplateStringsArray) => {
      const query = strings.join('');
      expect(query).toContain('merchant_key = ANY');
      expect(query).not.toMatch(/\bLIMIT\b/);
      expect(query).toContain("AND type = 'debit'");
      return [
        { merchant_key: 'zomato', debit_count: '5', debit_paisa: '15000' },
        { merchant_key: 'blinkit', debit_count: '3', debit_paisa: '9000' },
      ];
    });

    const rows = await fetchClusterMerchantAggregates(
      sql as never,
      'user-1',
      '2026-04-01',
      '2026-04-30',
      null,
      ['zomato', 'blinkit', 'swiggy']
    );

    expect(rows).toEqual([
      { merchant_key: 'zomato', debit_count: 5, debit_paisa: 15000 },
      { merchant_key: 'blinkit', debit_count: 3, debit_paisa: 9000 },
    ]);
  });

  it('fetchClusterMerchantAggregates short-circuits on empty key list', async () => {
    const sql = vi.fn();
    const rows = await fetchClusterMerchantAggregates(
      sql as never,
      'user-1',
      '2026-04-01',
      '2026-04-30',
      null,
      []
    );
    expect(rows).toEqual([]);
    expect(sql).not.toHaveBeenCalled();
  });

  it('uses debit-only aggregation for statement-scoped frequency queries', async () => {
    const sql = vi.fn(async (strings: TemplateStringsArray) => {
      const query = strings.join('');
      expect(query).toContain("AND type = 'debit'");
      expect(query).toContain('statement_id = ANY');
      return [{ merchant_key: 'blinkit', debit_count: '1', debit_paisa: '1200' }];
    });

    const rows = await fetchTopMerchantsByFrequency(
      sql as never,
      'user-1',
      '2026-04-01',
      '2026-04-30',
      ['11111111-1111-4111-8111-111111111111']
    );

    expect(rows).toEqual([{ merchant_key: 'blinkit', debit_count: 1, debit_paisa: 1200 }]);
  });
});
