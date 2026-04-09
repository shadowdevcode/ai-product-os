'use client';

import { useEffect, type MutableRefObject } from 'react';
import type { StatementListItem } from '@/lib/statements-list';

type Router = { replace: (href: string, options?: { scroll?: boolean }) => void };

/** Loads dashboard when URL scope or statement list changes; normalizes legacy `statement_id`. */
export function useDashboardInitialLoadEffect(opts: {
  statements: StatementListItem[] | null;
  statementIdFromUrl: string | null;
  tabParam: string | null;
  isUnifiedUrl: boolean;
  dashboardScopeKey: string;
  loadDashboard: (override?: URLSearchParams) => Promise<void>;
  router: Router;
  dashboardLoadedForScopeRef: MutableRefObject<string | null>;
}) {
  const {
    statements,
    statementIdFromUrl,
    tabParam,
    isUnifiedUrl,
    dashboardScopeKey,
    loadDashboard,
    router,
    dashboardLoadedForScopeRef,
  } = opts;

  useEffect(() => {
    if (statements === null) {
      return;
    }
    if (statements.length === 0) {
      dashboardLoadedForScopeRef.current = 'empty';
      void loadDashboard(new URLSearchParams());
      return;
    }

    if (isUnifiedUrl) {
      if (dashboardLoadedForScopeRef.current === dashboardScopeKey) {
        return;
      }
      dashboardLoadedForScopeRef.current = dashboardScopeKey;
      void loadDashboard();
      return;
    }

    const valid =
      statementIdFromUrl && statements.some((s) => s.id === statementIdFromUrl)
        ? statementIdFromUrl
        : statements[0].id;

    if (valid !== statementIdFromUrl) {
      const q = new URLSearchParams();
      q.set('statement_id', valid);
      const t = tabParam;
      if (t && (t === 'insights' || t === 'sync' || t === 'transactions')) {
        q.set('tab', t);
      }
      router.replace(`/dashboard?${q.toString()}`, { scroll: false });
      return;
    }

    if (dashboardLoadedForScopeRef.current === dashboardScopeKey) {
      return;
    }
    dashboardLoadedForScopeRef.current = dashboardScopeKey;
    void loadDashboard();
  }, [
    statements,
    statementIdFromUrl,
    isUnifiedUrl,
    loadDashboard,
    router,
    dashboardScopeKey,
    tabParam,
    dashboardLoadedForScopeRef,
  ]);
}
