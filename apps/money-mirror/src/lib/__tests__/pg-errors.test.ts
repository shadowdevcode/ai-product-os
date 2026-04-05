import { describe, expect, it } from 'vitest';
import { isUndefinedColumnError } from '../pg-errors';

describe('isUndefinedColumnError', () => {
  it('returns true for Postgres code 42703', () => {
    expect(isUndefinedColumnError({ code: '42703', message: 'x' })).toBe(true);
  });

  it('returns true when message mentions missing column', () => {
    expect(isUndefinedColumnError(new Error('column t.merchant_key does not exist'))).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isUndefinedColumnError(new Error('connection refused'))).toBe(false);
    expect(isUndefinedColumnError(null)).toBe(false);
  });
});
