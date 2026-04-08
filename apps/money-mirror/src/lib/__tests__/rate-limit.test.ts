import { describe, expect, it, vi } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limit';

describe('checkRateLimit', () => {
  it('allows requests until limit and then blocks', () => {
    const key = `k-${Date.now()}`;
    const first = checkRateLimit(key, { limit: 2, windowMs: 60_000 });
    const second = checkRateLimit(key, { limit: 2, windowMs: 60_000 });
    const third = checkRateLimit(key, { limit: 2, windowMs: 60_000 });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(third.ok).toBe(false);
  });

  it('resets a bucket after the window expires', () => {
    const key = `expiry-${Date.now()}`;
    const now = Date.now();
    const spy = vi.spyOn(Date, 'now');

    spy.mockReturnValue(now);
    expect(checkRateLimit(key, { limit: 1, windowMs: 1_000 }).ok).toBe(true);

    spy.mockReturnValue(now + 1_001);
    const result = checkRateLimit(key, { limit: 1, windowMs: 1_000 });

    expect(result.ok).toBe(true);
    spy.mockRestore();
  });
});
