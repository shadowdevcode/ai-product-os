import { describe, expect, it } from 'vitest';
import { normalizeUserPlan } from '@/lib/user-plan';

describe('normalizeUserPlan', () => {
  it('maps pro and defaults everything else to free', () => {
    expect(normalizeUserPlan('pro')).toBe('pro');
    expect(normalizeUserPlan('free')).toBe('free');
    expect(normalizeUserPlan(null)).toBe('free');
    expect(normalizeUserPlan(undefined)).toBe('free');
    expect(normalizeUserPlan('')).toBe('free');
  });
});
