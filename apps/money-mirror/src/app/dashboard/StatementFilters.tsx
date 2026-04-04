'use client';

import type { StatementListItem } from '@/lib/statements-list';
import { statementPickerLabel } from '@/lib/statements-list';
import {
  formatMonthKeyForDisplay,
  listMonthKeysFromPeriodEnds,
  monthKeyFromPeriodEnd,
} from '@/lib/format-date';

interface StatementFiltersProps {
  statements: StatementListItem[];
  selectedStatementId: string;
  monthFilter: string | 'all';
  onMonthChange: (key: string | 'all') => void;
  onStatementChange: (statementId: string) => void;
}

export function StatementFilters({
  statements,
  selectedStatementId,
  monthFilter,
  onMonthChange,
  onStatementChange,
}: StatementFiltersProps) {
  const monthKeys = listMonthKeysFromPeriodEnds(statements.map((s) => s.period_end));

  const filtered =
    monthFilter === 'all'
      ? statements
      : statements.filter((s) => monthKeyFromPeriodEnd(s.period_end) === monthFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
        Filter by month
        <select
          value={monthFilter}
          onChange={(e) => onMonthChange(e.target.value === 'all' ? 'all' : e.target.value)}
          style={{ marginTop: '6px' }}
          aria-label="Filter statements by month"
        >
          <option value="all">All months</option>
          {monthKeys.map((k) => (
            <option key={k} value={k}>
              {formatMonthKeyForDisplay(k)}
            </option>
          ))}
        </select>
      </label>
      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
        Statement
        <select
          value={selectedStatementId}
          onChange={(e) => onStatementChange(e.target.value)}
          style={{ marginTop: '6px' }}
          aria-label="Select a statement"
        >
          {filtered.length === 0 ? (
            <option value="">No statement for this month</option>
          ) : (
            filtered.map((s) => (
              <option key={s.id} value={s.id}>
                {statementPickerLabel(s)}
              </option>
            ))
          )}
        </select>
      </label>
    </div>
  );
}
