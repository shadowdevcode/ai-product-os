'use client';

import { useCallback, useMemo, useState } from 'react';
import type { StatementListItem } from '@/lib/statements-list';
import { statementPickerLabel } from '@/lib/statements-list';
import {
  type DatePresetId,
  parseDashboardScopeFromSearchParams,
  presetToRange,
  type UnifiedScopeInput,
} from '@/lib/scope';

export type ApplyUnifiedPayload = {
  scope: UnifiedScopeInput;
  /** Telemetry: preset id or `custom` */
  datePreset: string | null;
};

type Props = {
  statements: StatementListItem[];
  searchParams: URLSearchParams;
  onApplyUnified: (payload: ApplyUnifiedPayload) => void;
  onApplyLegacy: (statementId: string) => void;
};

export function ScopeBar({ statements, searchParams, onApplyUnified, onApplyLegacy }: Props) {
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => parseDashboardScopeFromSearchParams(searchParams), [searchParams]);

  const isUnified = !('error' in parsed) && parsed.variant === 'unified';

  const summary = useMemo(() => {
    if ('error' in parsed) {
      return null;
    }
    if (parsed.variant === 'unified') {
      const idCount =
        parsed.scope.statementIds === null || parsed.scope.statementIds.length === 0
          ? statements.length
          : parsed.scope.statementIds.length;
      const src =
        parsed.scope.statementIds === null || parsed.scope.statementIds.length === 0
          ? 'All accounts'
          : `${parsed.scope.statementIds.length} account${parsed.scope.statementIds.length === 1 ? '' : 's'}`;
      return `${parsed.scope.dateFrom} → ${parsed.scope.dateTo} · ${src} (${idCount} statement${idCount === 1 ? '' : 's'})`;
    }
    const sid = parsed.statementId;
    const st = sid ? statements.find((s) => s.id === sid) : statements[0];
    return st ? `Single statement · ${statementPickerLabel(st)}` : 'Single statement';
  }, [parsed, statements]);

  const [preset, setPreset] = useState<DatePresetId>('last_30');
  const [dateFrom, setDateFrom] = useState(() => presetToRange('last_30').dateFrom);
  const [dateTo, setDateTo] = useState(() => presetToRange('last_30').dateTo);
  const [allSources, setAllSources] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const hydrateEditorFromCurrentScope = useCallback(() => {
    if ('error' in parsed) {
      return;
    }

    if (parsed.variant === 'unified') {
      setPreset('custom');
      setDateFrom(parsed.scope.dateFrom);
      setDateTo(parsed.scope.dateTo);
      if (parsed.scope.statementIds === null || parsed.scope.statementIds.length === 0) {
        setAllSources(true);
        setSelected({});
        return;
      }
      setAllSources(false);
      setSelected(Object.fromEntries(parsed.scope.statementIds.map((id) => [id, true])));
      return;
    }

    const defaultRange = presetToRange('last_30');
    setPreset('last_30');
    setDateFrom(defaultRange.dateFrom);
    setDateTo(defaultRange.dateTo);
    setAllSources(true);
    setSelected({});
  }, [parsed]);

  const toggleStatement = useCallback((id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const applyPreset = useCallback((p: DatePresetId) => {
    setPreset(p);
    if (p === 'custom') {
      return;
    }
    const r = presetToRange(p);
    setDateFrom(r.dateFrom);
    setDateTo(r.dateTo);
  }, []);

  const handleApply = useCallback(() => {
    let statementIds: string[] | null = null;
    if (!allSources) {
      const ids = statements.filter((s) => selected[s.id]).map((s) => s.id);
      if (ids.length === 0) {
        return;
      }
      statementIds = ids;
    }
    const scope: UnifiedScopeInput = {
      dateFrom,
      dateTo,
      statementIds,
    };
    const datePresetLabel = preset === 'custom' ? 'custom' : preset;
    onApplyUnified({ scope, datePreset: datePresetLabel });
    setOpen(false);
  }, [allSources, dateFrom, dateTo, onApplyUnified, preset, selected, statements]);

  const handleLegacyLatest = useCallback(() => {
    if (statements[0]) {
      onApplyLegacy(statements[0].id);
    }
    setOpen(false);
  }, [onApplyLegacy, statements]);

  if (statements.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Dashboard scope"
      style={{
        marginBottom: '18px',
        padding: '14px 16px',
        borderRadius: '14px',
        border: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          SCOPE
        </span>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', flex: '1 1 200px' }}>
          {summary ?? '—'}
        </span>
        <button
          type="button"
          className="btn-ghost"
          style={{ fontSize: '0.78rem' }}
          onClick={() => {
            if (!open) {
              hydrateEditorFromCurrentScope();
            }
            setOpen((o) => !o);
          }}
          aria-expanded={open}
        >
          {open ? 'Close' : isUnified ? 'Edit scope' : 'Date range & sources'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Preset
            <select
              value={preset}
              onChange={(e) => applyPreset(e.target.value as DatePresetId)}
              style={{ marginTop: '6px', display: 'block', width: '100%', maxWidth: '280px' }}
            >
              <option value="last_30">Last 30 days</option>
              <option value="this_month">This month</option>
              <option value="last_month">Last month</option>
              <option value="custom">Custom range</option>
            </select>
          </label>

          {preset === 'custom' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                From
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{ marginTop: '6px', width: '100%' }}
                />
              </label>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                To
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{ marginTop: '6px', width: '100%' }}
                />
              </label>
            </div>
          )}

          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={allSources}
                onChange={(e) => setAllSources(e.target.checked)}
              />
              All uploaded statements in range
            </label>
            {!allSources && (
              <div
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  paddingLeft: '4px',
                }}
              >
                {statements.map((s) => (
                  <label
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(selected[s.id])}
                      onChange={() => toggleStatement(s.id)}
                    />
                    {statementPickerLabel(s)}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <button type="button" className="btn-primary" onClick={() => void handleApply()}>
              Apply scope
            </button>
            <button type="button" className="btn-ghost" onClick={() => void handleLegacyLatest()}>
              Latest statement only
            </button>
          </div>
          <p
            style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}
          >
            Overview and Transactions use the same date range and sources. Perceived spend is your
            monthly estimate from onboarding (not per account).
          </p>
        </div>
      )}
    </section>
  );
}
