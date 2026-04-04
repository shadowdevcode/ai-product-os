import { describe, expect, it } from 'vitest';
import {
  formatMonthKeyForDisplay,
  formatPeriodRange,
  formatStatementDate,
  monthKeyFromPeriodEnd,
  statementMonthLabel,
} from '@/lib/format-date';

describe('format-date', () => {
  it('formats ISO date strings without raw T00:00:00', () => {
    expect(formatStatementDate('2026-04-11T00:00:00.000Z')).toMatch(/11/);
    expect(formatStatementDate('2026-04-11T00:00:00.000Z')).toMatch(/2026/);
    expect(formatStatementDate('2026-04-11T00:00:00.000Z')).not.toContain('T');
  });

  it('formats YYYY-MM-DD', () => {
    expect(formatStatementDate('2026-03-22')).toMatch(/22/);
  });

  it('formatPeriodRange joins start and end', () => {
    const r = formatPeriodRange('2026-02-23', '2026-03-22');
    expect(r).toContain('–');
    expect(r).not.toContain('T');
  });

  it('statementMonthLabel uses period end', () => {
    expect(statementMonthLabel('2026-03-22')).toMatch(/March/);
    expect(statementMonthLabel('2026-03-22')).toMatch(/2026/);
  });

  it('monthKeyFromPeriodEnd', () => {
    expect(monthKeyFromPeriodEnd('2026-03-22')).toBe('2026-03');
  });

  it('formatMonthKeyForDisplay', () => {
    expect(formatMonthKeyForDisplay('2026-03')).toMatch(/March/);
  });
});
