'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Advisory } from '@/lib/advisory-engine';
import type { LayerAFacts } from '@/lib/coaching-facts';
import type { StatementType } from '@/lib/statements';
import type { StatementListItem } from '@/lib/statements-list';
import { monthKeyFromPeriodEnd } from '@/lib/format-date';
import { dashboardApiPathFromSearchParams } from '@/lib/scope';
import type { ApplyUnifiedPayload } from '@/components/ScopeBar';
import type { UploadFormMeta } from './UploadPanel';
import type { DashboardResult } from './dashboard-result-types';
import { useDashboardScopeDerived } from './useDashboardScopeDerived';

export { tabFromSearchParams } from './dashboard-tab-params';

export function useDashboardState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statementIdFromUrl = searchParams.get('statement_id');
  const isUnifiedUrl = Boolean(searchParams.get('date_from') && searchParams.get('date_to'));

  const [result, setResult] = useState<DashboardResult | null>(null);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [coachingFacts, setCoachingFacts] = useState<LayerAFacts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [statementType, setStatementType] = useState<StatementType>('bank_account');
  const [statements, setStatements] = useState<StatementListItem[] | null>(null);
  const [monthFilter, setMonthFilter] = useState<string | 'all'>('all');
  const dashboardAbortRef = useRef<AbortController | null>(null);

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
      // Cancel any in-flight dashboard fetch (e.g. Gemini-enriched response from old scope)
      dashboardAbortRef.current?.abort();
      const ac = new AbortController();
      dashboardAbortRef.current = ac;

      setIsLoadingDashboard(true);
      setError(null);

      try {
        const path = dashboardApiPathFromSearchParams(override ?? searchParams);
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
    [searchParams]
  );

  useEffect(() => {
    loadStatements().catch(() => {});
  }, [loadStatements]);

  useEffect(() => {
    if (statements === null) {
      return;
    }
    if (statements.length === 0) {
      void loadDashboard(new URLSearchParams());
      return;
    }

    if (isUnifiedUrl) {
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
      const t = searchParams.get('tab');
      if (t && (t === 'insights' || t === 'upload' || t === 'transactions')) {
        q.set('tab', t);
      }
      router.replace(`/dashboard?${q.toString()}`, { scroll: false });
      return;
    }

    void loadDashboard();
  }, [statements, statementIdFromUrl, isUnifiedUrl, loadDashboard, router, searchParams]);

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
      router.replace(`/dashboard?${q.toString()}`, { scroll: false });
    },
    [statements, router, searchParams]
  );

  const handleStatementChange = useCallback(
    (statementId: string) => {
      if (!statementId) {
        return;
      }
      const q = new URLSearchParams(searchParams.toString());
      q.set('statement_id', statementId);
      router.replace(`/dashboard?${q.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const applyUnified = useCallback(
    (payload: ApplyUnifiedPayload) => {
      const q = new URLSearchParams();
      q.set('date_from', payload.scope.dateFrom);
      q.set('date_to', payload.scope.dateTo);
      if (payload.scope.statementIds?.length) {
        q.set('statement_ids', payload.scope.statementIds.join(','));
      }
      const t = searchParams.get('tab');
      if (t && t !== 'overview') {
        q.set('tab', t);
      }
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
    [router, searchParams, statements?.length]
  );

  const applyLegacy = useCallback(
    (statementId: string) => {
      const q = new URLSearchParams();
      q.set('statement_id', statementId);
      const t = searchParams.get('tab');
      if (t && t !== 'overview') {
        q.set('tab', t);
      }
      router.replace(`/dashboard?${q.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleUpload = useCallback(
    async (file: File, nextStatementType: StatementType, meta: UploadFormMeta) => {
      setError(null);

      if (file.type && file.type !== 'application/pdf') {
        setError('Please upload a PDF file.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File is too large. Maximum 10 MB.');
        return;
      }

      setIsParsing(true);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('statement_type', nextStatementType);
        if (meta.nickname) {
          formData.append('nickname', meta.nickname);
        }
        if (meta.accountPurpose) {
          formData.append('account_purpose', meta.accountPurpose);
        }
        if (nextStatementType === 'credit_card' && meta.cardNetwork) {
          formData.append('card_network', meta.cardNetwork);
        }

        const resp = await fetch('/api/statement/parse', { method: 'POST', body: formData });

        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(body.error ?? body.detail ?? `Upload failed (${resp.status})`);
        }

        const data: DashboardResult = await resp.json();
        await loadStatements();
        const next = new URLSearchParams();
        next.set('statement_id', data.statement_id);
        router.replace(`/dashboard?${next.toString()}`, { scroll: false });
        await loadDashboard(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        setIsParsing(false);
      }
    },
    [loadDashboard, loadStatements, router]
  );

  return {
    router,
    searchParams,
    isUnifiedUrl,
    result,
    advisories,
    coachingFacts,
    error,
    setError,
    isLoadingDashboard,
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
