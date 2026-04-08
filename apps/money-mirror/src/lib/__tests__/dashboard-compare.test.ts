import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSql = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => mockSql,
  toNumber: (value: bigint | number | string | null | undefined) => Number(value ?? 0),
}));

async function getFetchCompareMonthsData() {
  const mod = await import('@/lib/dashboard-compare');
  return mod.fetchCompareMonthsData;
}

function sqlText(strings: TemplateStringsArray): string {
  return strings.join(' ');
}

describe('fetchCompareMonthsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the previous comparable statement in legacy mode', async () => {
    mockSql.mockImplementation((strings: TemplateStringsArray, ...values: readonly unknown[]) => {
      const query = sqlText(strings);
      if (query.includes('FROM statements') && query.includes('AND id =')) {
        return Promise.resolve([
          {
            id: 'stmt-current',
            institution_name: 'HDFC',
            statement_type: 'bank_account',
            nickname: 'Main',
            account_purpose: 'spending',
            card_network: null,
            period_start: '2026-03-01',
            period_end: '2026-03-31',
          },
        ]);
      }
      if (query.includes('IS NOT DISTINCT FROM')) {
        return Promise.resolve([
          {
            id: 'stmt-previous',
            institution_name: 'HDFC',
            statement_type: 'bank_account',
            nickname: 'Main',
            account_purpose: 'spending',
            card_network: null,
            period_start: '2026-02-01',
            period_end: '2026-02-28',
          },
        ]);
      }
      if (query.includes('FROM transactions')) {
        const statementIds = values[1] as string[];
        if (statementIds[0] === 'stmt-current') {
          return Promise.resolve([{ total_debits_paisa: '250000', total_credits_paisa: '90000' }]);
        }
        if (statementIds[0] === 'stmt-previous') {
          return Promise.resolve([{ total_debits_paisa: '200000', total_credits_paisa: '75000' }]);
        }
      }
      throw new Error(`Unexpected SQL: ${query}`);
    });

    const fetchCompareMonthsData = await getFetchCompareMonthsData();
    const result = await fetchCompareMonthsData('user-123', {
      variant: 'legacy',
      statementId: 'stmt-current',
    });

    expect(result).not.toBeNull();
    expect(result?.current.date_from).toBe('2026-03-01');
    expect(result?.previous.date_from).toBe('2026-02-01');
    expect(result?.current.total_debits_paisa).toBe(250000);
    expect(result?.previous.total_debits_paisa).toBe(200000);
    expect(result?.delta.debits_paisa).toBe(50000);
  });

  it('returns null when no comparable previous statement exists in legacy mode', async () => {
    mockSql.mockImplementation((strings: TemplateStringsArray) => {
      const query = sqlText(strings);
      if (query.includes('FROM statements') && query.includes('AND id =')) {
        return Promise.resolve([
          {
            id: 'stmt-current',
            institution_name: 'HDFC',
            statement_type: 'bank_account',
            nickname: null,
            account_purpose: null,
            card_network: null,
            period_start: '2026-03-01',
            period_end: '2026-03-31',
          },
        ]);
      }
      if (query.includes('IS NOT DISTINCT FROM')) {
        return Promise.resolve([]);
      }
      throw new Error(`Unexpected SQL: ${query}`);
    });

    const fetchCompareMonthsData = await getFetchCompareMonthsData();
    const result = await fetchCompareMonthsData('user-123', {
      variant: 'legacy',
      statementId: 'stmt-current',
    });

    expect(result).toBeNull();
  });
});
