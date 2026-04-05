import { useMemo } from 'react';
import type { StatementListItem } from '@/lib/statements-list';
import type { DashboardResult } from './dashboard-result-types';
import type { TxnScope } from './TransactionsPanel';
import { monthKeyFromPeriodEnd } from '@/lib/format-date';

export function useDashboardScopeDerived({
  statements,
  monthFilter,
  result,
}: {
  statements: StatementListItem[] | null;
  monthFilter: string | 'all';
  result: DashboardResult | null;
}) {
  const filteredStatements = useMemo(() => {
    if (!statements || monthFilter === 'all') {
      return statements ?? [];
    }
    return statements.filter((s) => monthKeyFromPeriodEnd(s.period_end) === monthFilter);
  }, [statements, monthFilter]);

  const effectiveSelectedId = useMemo(() => {
    return result?.statement_id && filteredStatements.some((s) => s.id === result.statement_id)
      ? result.statement_id
      : (filteredStatements[0]?.id ?? result?.statement_id ?? '');
  }, [result, filteredStatements]);

  const txnScope = useMemo((): TxnScope | null => {
    if (!result) {
      return null;
    }
    if (result.scope?.kind === 'unified' && result.scope.date_from && result.scope.date_to) {
      const inc = result.scope.included_statement_ids;
      const all =
        statements &&
        inc.length > 0 &&
        statements.length > 0 &&
        inc.length === statements.length &&
        statements.every((s) => inc.includes(s.id));
      return {
        mode: 'unified',
        dateFrom: result.scope.date_from,
        dateTo: result.scope.date_to,
        statementIds: all ? null : inc.length ? inc : null,
      };
    }
    if (!effectiveSelectedId) {
      return null;
    }
    return { mode: 'legacy', statementId: effectiveSelectedId };
  }, [result, statements, effectiveSelectedId]);

  return { filteredStatements, effectiveSelectedId, txnScope };
}
