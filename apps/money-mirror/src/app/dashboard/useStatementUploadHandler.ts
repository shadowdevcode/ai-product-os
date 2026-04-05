'use client';

import { useCallback, type MutableRefObject } from 'react';
import type { StatementType } from '@/lib/statements';
import type { UploadFormMeta } from './UploadPanel';
import type { DashboardResult } from './dashboard-result-types';

type LoadDashboard = (override?: URLSearchParams) => Promise<void>;
type LoadStatements = () => Promise<void>;

/** Minimal router surface for upload redirect (avoids internal Next types). */
type DashboardRouter = {
  replace: (href: string, options?: { scroll?: boolean }) => void;
};

export function useStatementUploadHandler(opts: {
  router: DashboardRouter;
  loadDashboard: LoadDashboard;
  loadStatements: LoadStatements;
  setError: (v: string | null) => void;
  setIsParsing: (v: boolean) => void;
  dashboardLoadedForScopeRef: MutableRefObject<string | null>;
  narrativesFetchedForScopeRef: MutableRefObject<string | null>;
}) {
  const {
    router,
    loadDashboard,
    loadStatements,
    setError,
    setIsParsing,
    dashboardLoadedForScopeRef,
    narrativesFetchedForScopeRef,
  } = opts;

  return useCallback(
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
        dashboardLoadedForScopeRef.current = `legacy:${data.statement_id}`;
        narrativesFetchedForScopeRef.current = null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        setIsParsing(false);
      }
    },
    [
      loadDashboard,
      loadStatements,
      router,
      setError,
      setIsParsing,
      dashboardLoadedForScopeRef,
      narrativesFetchedForScopeRef,
    ]
  );
}
