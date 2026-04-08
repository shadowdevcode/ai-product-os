'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Advisory } from '@/lib/advisory-engine';
import type { LayerAFacts } from '@/lib/coaching-facts';
import type { StatementType } from '@/lib/statements';
import type { StatementListItem } from '@/lib/statements-list';
import { monthKeyFromPeriodEnd } from '@/lib/format-date';
import { dashboardApiPathFromSearchParams } from '@/lib/scope';
import type { ApplyUnifiedPayload } from '@/components/ScopeBar';
import type { DashboardResult } from './dashboard-result-types';
import { useDashboardScopeDerived } from './useDashboardScopeDerived';
import { useDashboardUrlModel } from './useDashboardUrlModel';
import { useDashboardInitialLoadEffect } from './useDashboardInitialLoadEffect';
import { useStatementUploadHandler } from './useStatementUploadHandler';
import { tabFromSearchParams } from './dashboard-tab-params';

export { tabFromSearchParams } from './dashboard-tab-params';

export function useDashboardState() {
  const router = useRouter();
  const {
    searchParams,
    statementIdFromUrl,
    tabParam,
    isUnifiedUrl,
    dashboardScopeKey,
    dashboardApiPath,
  } = useDashboardUrlModel();
  const canonicalTab = tabFromSearchParams(searchParams);

  const [result, setResult] = useState<DashboardResult | null>(null);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [coachingFacts, setCoachingFacts] = useState<LayerAFacts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isLoadingNarratives, setIsLoadingNarratives] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [statementType, setStatementType] = useState<StatementType>('bank_account');
  const [statements, setStatements] = useState<StatementListItem[] | null>(null);
  const [monthFilter, setMonthFilter] = useState<string | 'all'>('all');
  const dashboardAbortRef = useRef<AbortController | null>(null);
  const dashboardLoadedForScopeRef = useRef<string | null>(null);
  const narrativesFetchedForScopeRef = useRef<string | null>(null);

  const { filteredStatements, effectiveSelectedId, txnScope } = useDashboardScopeDerived({
    statements,
    monthFilter,
    result,
  });

  const loadStatements = useCallback(async () => {
    const resp = await fetch('/api/statements');
    if (!resp.ok) {
      setStatements([]);
      return;
    }
    const data = (await resp.json()) as { statements?: StatementListItem[] };
    setStatements(data.statements ?? []);
  }, []);

  const loadDashboard = useCallback(
    async (override?: URLSearchParams) => {
      dashboardAbortRef.current?.abort();
      const ac = new AbortController();
      dashboardAbortRef.current = ac;

      setIsLoadingDashboard(true);
      setError(null);

      try {
        const path = override ? dashboardApiPathFromSearchParams(override) : dashboardApiPath;
        const resp = await fetch(`/api/dashboard${path}`, { signal: ac.signal });

        if (resp.status === 404) {
          setResult(null);
          setAdvisories([]);
          setCoachingFacts(null);
          return;
        }

        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(body.error ?? body.detail ?? `Dashboard load failed (${resp.status})`);
        }

        const data: DashboardResult & { advisories: Advisory[] } = await resp.json();
        setResult(data);
        setAdvisories(data.advisories);
        setCoachingFacts(data.coaching_facts ?? null);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load your dashboard.');
        setResult(null);
        setAdvisories([]);
        setCoachingFacts(null);
      } finally {
        setIsLoadingDashboard(false);
      }
    },
    [dashboardApiPath]
  );

  const loadCoachingNarratives = useCallback(async (): Promise<boolean> => {
    setIsLoadingNarratives(true);
    try {
      const resp = await fetch(`/api/dashboard/advisories${dashboardApiPath}`);
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error ?? `Advisories load failed (${resp.status})`);
      }
      const data = (await resp.json()) as { advisories: Advisory[]; coaching_facts: LayerAFacts };
      setAdvisories(data.advisories);
      setCoachingFacts(data.coaching_facts);
      return true;
    } catch {
      return false;
    } finally {
      setIsLoadingNarratives(false);
    }
  }, [dashboardApiPath]);

  useEffect(() => {
    loadStatements().catch(() => {});
  }, [loadStatements]);

  useEffect(() => {
    narrativesFetchedForScopeRef.current = null;
  }, [dashboardScopeKey]);

  useDashboardInitialLoadEffect({
    statements,
    statementIdFromUrl,
    tabParam,
    isUnifiedUrl,
    dashboardScopeKey,
    loadDashboard,
    router,
    dashboardLoadedForScopeRef,
  });

  useEffect(() => {
    if (tabParam !== 'insights') {
      return;
    }
    if (statements === null || statements.length === 0) {
      return;
    }
    if (isLoadingDashboard || !result) {
      return;
    }
    if (narrativesFetchedForScopeRef.current === dashboardScopeKey) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const ok = await loadCoachingNarratives();
      if (!cancelled && ok) {
        narrativesFetchedForScopeRef.current = dashboardScopeKey;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tabParam, statements, isLoadingDashboard, result, dashboardScopeKey, loadCoachingNarratives]);

  const handleMonthChange = useCallback(
    (key: string | 'all') => {
      setMonthFilter(key);
      if (!statements || statements.length === 0) {
        return;
      }
      const pool =
        key === 'all'
          ? statements
          : statements.filter((s) => monthKeyFromPeriodEnd(s.period_end) === key);
      if (pool.length === 0) {
        return;
      }
      const next = pool[0].id;
      const q = new URLSearchParams(searchParams.toString());
      q.set('statement_id', next);
      q.set('tab', canonicalTab);
      router.replace(`/dashboard?${q.toString()}`, { scroll: false });
    },
    [canonicalTab, statements, router, searchParams]
  );

  const handleStatementChange = useCallback(
    (statementId: string) => {
      if (!statementId) {
        return;
      }
      const q = new URLSearchParams(searchParams.toString());
      q.set('statement_id', statementId);
      q.set('tab', canonicalTab);
      router.replace(`/dashboard?${q.toString()}`, { scroll: false });
    },
    [canonicalTab, router, searchParams]
  );

  const applyUnified = useCallback(
    (payload: ApplyUnifiedPayload) => {
      const q = new URLSearchParams();
      q.set('date_from', payload.scope.dateFrom);
      q.set('date_to', payload.scope.dateTo);
      if (payload.scope.statementIds?.length) {
        q.set('statement_ids', payload.scope.statementIds.join(','));
      }
      q.set('tab', canonicalTab);
      router.replace(`/dashboard?${q.toString()}`, { scroll: false });
      const n = payload.scope.statementIds?.length ?? statements?.length ?? 0;
      void fetch('/api/dashboard/scope-changed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_preset: payload.datePreset,
          source_count: n,
        }),
      }).catch(() => {});
    },
    [canonicalTab, router, statements?.length]
  );

  const applyLegacy = useCallback(
    (statementId: string) => {
      const q = new URLSearchParams();
      q.set('statement_id', statementId);
      q.set('tab', canonicalTab);
      router.replace(`/dashboard?${q.toString()}`, { scroll: false });
    },
    [canonicalTab, router]
  );

  const handleUpload = useStatementUploadHandler({
    router,
    loadDashboard,
    loadStatements,
    setError,
    setIsParsing,
    dashboardLoadedForScopeRef,
    narrativesFetchedForScopeRef,
  });

  return {
    router,
    searchParams,
    isUnifiedUrl,
    dashboardScopeKey,
    result,
    advisories,
    coachingFacts,
    error,
    setError,
    isLoadingDashboard,
    isLoadingNarratives,
    isParsing,
    statementType,
    setStatementType,
    statements,
    monthFilter,
    filteredStatements,
    effectiveSelectedId,
    txnScope,
    handleMonthChange,
    handleStatementChange,
    applyUnified,
    applyLegacy,
    handleUpload,
  };
}
