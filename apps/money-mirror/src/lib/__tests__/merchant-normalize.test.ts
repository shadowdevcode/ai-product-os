import { describe, expect, it } from 'vitest';
import {
  extractUpiHandle,
  formatMerchantKeyForDisplay,
  normalizeMerchantKey,
} from '@/lib/merchant-normalize';

describe('normalizeMerchantKey', () => {
  it('maps known brands', () => {
    expect(normalizeMerchantKey('ZOMATO ORDER 450')).toBe('zomato');
    expect(normalizeMerchantKey('Paid SWIGGY')).toBe('swiggy');
  });

  it('extracts UPI handle prefix', () => {
    expect(normalizeMerchantKey('UPI merchant.name@oksbi')).toContain('upi_merchant');
  });

  it('returns null for empty', () => {
    expect(normalizeMerchantKey('   ')).toBeNull();
  });

  it('extractUpiHandle returns lowercase VPA', () => {
    expect(extractUpiHandle('UPI 1234567890@oksbi ref')).toBe('1234567890@oksbi');
    expect(extractUpiHandle('no handle here')).toBeNull();
  });

  it('formatMerchantKeyForDisplay replaces underscores', () => {
    expect(formatMerchantKeyForDisplay('upi_merchant')).toBe('upi merchant');
  });

  it('slugifies first segment when no brand match', () => {
    const k = normalizeMerchantKey('LOCAL STORE MUMBAI DR');
    expect(k).toBeTruthy();
    expect(k?.length).toBeGreaterThan(2);
  });
});
