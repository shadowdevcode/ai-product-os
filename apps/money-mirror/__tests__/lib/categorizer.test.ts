/**
 * Tests for categorizer.ts
 */

import { describe, it, expect } from 'vitest';
import {
  categorizeCreditCardTransaction,
  categorizeTransaction,
  summarizeByCategory,
  type CategorizedTransaction,
} from '@/lib/categorizer';

const debit = (desc: string, amount = 50000) =>
  categorizeTransaction(desc, amount, '2026-03-15', 'debit');

const credit = (desc: string, amount = 100000) =>
  categorizeTransaction(desc, amount, '2026-03-01', 'credit');

describe('categorizeTransaction', () => {
  // ── Needs ──────────────────────────────────────────────────
  it('categorizes Zepto as needs', () => {
    expect(debit('ZEPTO').category).toBe('needs');
  });

  it('categorizes Blinkit as needs', () => {
    expect(debit('BLINKIT').category).toBe('needs');
  });

  it('categorizes Uber as needs', () => {
    expect(debit('UBER TRIP').category).toBe('needs');
  });

  it('categorizes rent payment as needs', () => {
    expect(debit('RENT PAYMENT APR').category).toBe('needs');
  });

  // ── Wants ──────────────────────────────────────────────────
  it('categorizes Swiggy as wants', () => {
    expect(debit('SWIGGY').category).toBe('wants');
  });

  it('categorizes Netflix as wants', () => {
    expect(debit('NETFLIX SUBSCRIPTION').category).toBe('wants');
  });

  it('categorizes Myntra as wants', () => {
    expect(debit('MYNTRA FASHION').category).toBe('wants');
  });

  // ── Investment ─────────────────────────────────────────────
  it('categorizes SIP as investment', () => {
    expect(debit('SIP AXIS BLUECHIP').category).toBe('investment');
  });

  it('categorizes Groww as investment', () => {
    expect(debit('GROWW MUTUAL FUND').category).toBe('investment');
  });

  // ── Debt ───────────────────────────────────────────────────
  it('categorizes EMI as debt', () => {
    expect(debit('EMI HDFC BANK').category).toBe('debt');
  });

  it('categorizes BNPL as debt', () => {
    expect(debit('LAZYPAY REPAYMENT').category).toBe('debt');
  });

  // ── Credits always other ────────────────────────────────────
  it('marks salary credit as other regardless of keyword', () => {
    const result = credit('SALARY JANUARY');
    expect(result.category).toBe('other');
    expect(result.type).toBe('credit');
  });

  // ── Recurring detection ─────────────────────────────────────
  it('marks SIP as recurring', () => {
    expect(debit('SIP NAVI MUTUAL').is_recurring).toBe(true);
  });

  it('does not mark one-off spend as recurring', () => {
    expect(debit('SWIGGY ORDER').is_recurring).toBe(false);
  });

  // ── Priority: investment wins over needs keyword clash ──────
  it('prioritizes investment over wants when both match (e.g. Groww)', () => {
    // Groww could be considered digital but is investment
    const result = debit('GROWW SIP');
    expect(result.category).toBe('investment');
  });
});

describe('summarizeByCategory', () => {
  const txns: CategorizedTransaction[] = [
    {
      description: 'SWIGGY',
      amount_paisa: 50000,
      date: '2026-03-15',
      type: 'debit',
      category: 'wants',
      is_recurring: false,
    },
    {
      description: 'RENT',
      amount_paisa: 1500000,
      date: '2026-03-01',
      type: 'debit',
      category: 'needs',
      is_recurring: false,
    },
    {
      description: 'SIP',
      amount_paisa: 500000,
      date: '2026-03-05',
      type: 'debit',
      category: 'investment',
      is_recurring: true,
    },
    {
      description: 'SALARY',
      amount_paisa: 8000000,
      date: '2026-03-01',
      type: 'credit',
      category: 'other',
      is_recurring: false,
    },
  ];

  it('correctly sums debit buckets', () => {
    const s = summarizeByCategory(txns);
    expect(s.wants).toBe(50000);
    expect(s.needs).toBe(1500000);
    expect(s.investment).toBe(500000);
    expect(s.total_debits).toBe(2050000);
  });

  it('correctly sums credits', () => {
    const s = summarizeByCategory(txns);
    expect(s.total_credits).toBe(8000000);
  });

  it('credits do not count toward debit buckets', () => {
    const s = summarizeByCategory(txns);
    expect(s.other).toBe(0); // credit "other" doesn't count toward debit total
  });
});

describe('categorizeCreditCardTransaction', () => {
  it('treats card payments as credit without counting them as income', () => {
    const result = categorizeCreditCardTransaction(
      'PAYMENT RECEIVED',
      500000,
      '2026-03-10',
      'payment'
    );
    expect(result.type).toBe('credit');
    expect(result.category).toBe('debt');
  });

  it('treats refunds as non-income credits', () => {
    const result = categorizeCreditCardTransaction('AMAZON REFUND', 120000, '2026-03-11', 'refund');
    expect(result.type).toBe('credit');
    expect(result.category).toBe('other');
  });

  it('treats interest as debt', () => {
    const result = categorizeCreditCardTransaction(
      'FINANCE CHARGES',
      25000,
      '2026-03-12',
      'interest'
    );
    expect(result.type).toBe('debit');
    expect(result.category).toBe('debt');
  });
});
