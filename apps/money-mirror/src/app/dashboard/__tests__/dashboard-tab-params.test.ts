import { describe, expect, it } from 'vitest';
import { tabFromSearchParams } from '@/app/dashboard/dashboard-tab-params';

function makeSearchParams(raw: string) {
  return new URLSearchParams(raw);
}

describe('tabFromSearchParams', () => {
  it('defaults to overview when tab is missing', () => {
    expect(tabFromSearchParams(makeSearchParams(''))).toBe('overview');
  });

  it('returns the tab when valid', () => {
    expect(tabFromSearchParams(makeSearchParams('tab=insights'))).toBe('insights');
    expect(tabFromSearchParams(makeSearchParams('tab=transactions'))).toBe('transactions');
    expect(tabFromSearchParams(makeSearchParams('tab=sync'))).toBe('sync');
    expect(tabFromSearchParams(makeSearchParams('tab=overview'))).toBe('overview');
  });

  it('falls back to overview when tab is invalid', () => {
    expect(tabFromSearchParams(makeSearchParams('tab=bad'))).toBe('overview');
  });
});
