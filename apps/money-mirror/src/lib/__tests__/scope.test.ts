import { describe, expect, it } from 'vitest';
import {
  isValidIsoDate,
  parseDashboardScopeFromSearchParams,
  parseStatementIdsParam,
  presetToRange,
} from '@/lib/scope';

describe('scope', () => {
  it('parseStatementIdsParam: null → all sources', () => {
    expect(parseStatementIdsParam(null)).toEqual({ ok: true, value: null });
  });

  it('parseStatementIdsParam: single valid uuid', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(parseStatementIdsParam(id)).toEqual({ ok: true, value: [id] });
  });

  it('parseStatementIdsParam: rejects bad uuid', () => {
    const r = parseStatementIdsParam('not-a-uuid');
    expect(r.ok).toBe(false);
  });

  it('parseDashboardScopeFromSearchParams: legacy statement_id', () => {
    const sp = new URLSearchParams();
    sp.set('statement_id', '550e8400-e29b-41d4-a716-446655440000');
    expect(parseDashboardScopeFromSearchParams(sp)).toEqual({
      variant: 'legacy',
      statementId: '550e8400-e29b-41d4-a716-446655440000',
    });
  });

  it('parseDashboardScopeFromSearchParams: unified range', () => {
    const sp = new URLSearchParams();
    sp.set('date_from', '2026-01-01');
    sp.set('date_to', '2026-01-31');
    const r = parseDashboardScopeFromSearchParams(sp);
    expect(r).toEqual({
      variant: 'unified',
      scope: {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        statementIds: null,
      },
    });
  });

  it('parseDashboardScopeFromSearchParams: rejects partial dates', () => {
    const sp = new URLSearchParams();
    sp.set('date_from', '2026-01-01');
    expect(parseDashboardScopeFromSearchParams(sp)).toHaveProperty('error');
  });

  it('isValidIsoDate', () => {
    expect(isValidIsoDate('2026-02-01')).toBe(true);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
  });

  it('presetToRange last_30 spans 30 days', () => {
    const fixed = new Date('2026-04-05T12:00:00Z');
    const { dateFrom, dateTo } = presetToRange('last_30', fixed);
    expect(dateTo).toBe('2026-04-05');
    expect(dateFrom).toBe('2026-03-07');
  });
});
