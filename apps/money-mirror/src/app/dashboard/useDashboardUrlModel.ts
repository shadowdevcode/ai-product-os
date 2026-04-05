'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { dashboardApiPathFromSearchParams } from '@/lib/scope';

/** URL-derived dashboard scope: unified date range vs legacy `statement_id`. */
export function useDashboardUrlModel() {
  const searchParams = useSearchParams();
  const statementIdFromUrl = searchParams.get('statement_id');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const statementIdsParam = searchParams.get('statement_ids');
  const tabParam = searchParams.get('tab');
  const isUnifiedUrl = Boolean(dateFrom && dateTo);

  const dashboardScopeKey = useMemo(() => {
    if (dateFrom && dateTo) {
      return `unified:${dateFrom}:${dateTo}:${statementIdsParam ?? ''}`;
    }
    if (statementIdFromUrl) {
      return `legacy:${statementIdFromUrl}`;
    }
    return 'none';
  }, [dateFrom, dateTo, statementIdsParam, statementIdFromUrl]);

  /** Same query string as `/api/dashboard` — excludes `tab` and other non-scope params. */
  const dashboardApiPath = useMemo(() => {
    const sp = new URLSearchParams();
    if (dateFrom && dateTo) {
      sp.set('date_from', dateFrom);
      sp.set('date_to', dateTo);
      if (statementIdsParam) {
        sp.set('statement_ids', statementIdsParam);
      }
    } else if (statementIdFromUrl) {
      sp.set('statement_id', statementIdFromUrl);
    }
    return dashboardApiPathFromSearchParams(sp);
  }, [dateFrom, dateTo, statementIdsParam, statementIdFromUrl]);

  return {
    searchParams,
    statementIdFromUrl,
    dateFrom,
    dateTo,
    statementIdsParam,
    tabParam,
    isUnifiedUrl,
    dashboardScopeKey,
    dashboardApiPath,
  };
}
