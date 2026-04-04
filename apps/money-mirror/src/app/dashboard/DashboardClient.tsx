'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Advisory } from '@/lib/advisory-engine';
import type { StatementType } from '@/lib/statements';
import type { StatementListItem } from '@/lib/statements-list';
import { monthKeyFromPeriodEnd } from '@/lib/format-date';
import { UploadPanel, type UploadFormMeta } from './UploadPanel';
import { ParsingPanel } from './ParsingPanel';
import { ResultsPanel } from './ResultsPanel';
import { InsightsPanel } from './InsightsPanel';
import { DashboardNav, type DashboardTab } from './DashboardNav';
import { StatementFilters } from './StatementFilters';
import { DashboardLoadingSkeleton } from './DashboardLoadingSkeleton';
import { DashboardBrandBar } from './DashboardBrandBar';
import type { DashboardResult } from './dashboard-result-types';

export function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statementIdFromUrl = searchParams.get('statement_id');

  const [result, setResult] = useState<DashboardResult | null>(null);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [statementType, setStatementType] = useState<StatementType>('bank_account');
  const [statements, setStatements] = useState<StatementListItem[] | null>(null);
  const [tab, setTab] = useState<DashboardTab>('overview');
  const [monthFilter, setMonthFilter] = useState<string | 'all'>('all');

  const loadStatements = useCallback(async () => {
    const resp = await fetch('/api/statements');
    if (!resp.ok) {
      setStatements([]);
      return;
    }
    const data = (await resp.json()) as { statements?: StatementListItem[] };
    setStatements(data.statements ?? []);
  }, []);

  const loadDashboard = useCallback(async (statementId: string | null) => {
    setIsLoadingDashboard(true);
    setError(null);

    try {
      const query = statementId ? `?statement_id=${encodeURIComponent(statementId)}` : '';
      const resp = await fetch(`/api/dashboard${query}`);

      if (resp.status === 404) {
        setResult(null);
        setAdvisories([]);
        return;
      }

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error ?? body.detail ?? `Dashboard load failed (${resp.status})`);
      }

      const data: DashboardResult & { advisories: Advisory[] } = await resp.json();
      setResult(data);
      setAdvisories(data.advisories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your dashboard.');
      setResult(null);
      setAdvisories([]);
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    loadStatements().catch(() => {});
  }, [loadStatements]);

  useEffect(() => {
    if (statements === null) {
      return;
    }
    if (statements.length === 0) {
      loadDashboard(null).catch(() => {});
      return;
    }

    const valid =
      statementIdFromUrl && statements.some((s) => s.id === statementIdFromUrl)
        ? statementIdFromUrl
        : statements[0].id;

    if (valid !== statementIdFromUrl) {
      router.replace(`/dashboard?statement_id=${encodeURIComponent(valid)}`, { scroll: false });
      return;
    }

    loadDashboard(valid).catch(() => {});
  }, [statements, statementIdFromUrl, loadDashboard, router]);

  const filteredStatements = useMemo(() => {
    if (!statements || monthFilter === 'all') {
      return statements ?? [];
    }
    return statements.filter((s) => monthKeyFromPeriodEnd(s.period_end) === monthFilter);
  }, [statements, monthFilter]);

  const effectiveSelectedId =
    result?.statement_id && filteredStatements.some((s) => s.id === result.statement_id)
      ? result.statement_id
      : (filteredStatements[0]?.id ?? result?.statement_id ?? '');

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
      router.replace(`/dashboard?statement_id=${encodeURIComponent(next)}`, { scroll: false });
    },
    [statements, router]
  );

  const handleStatementChange = useCallback(
    (statementId: string) => {
      if (!statementId) {
        return;
      }
      router.replace(`/dashboard?statement_id=${encodeURIComponent(statementId)}`, {
        scroll: false,
      });
    },
    [router]
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
        router.replace(`/dashboard?statement_id=${encodeURIComponent(data.statement_id)}`, {
          scroll: false,
        });
        await loadDashboard(data.statement_id);
        setTab('overview');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        setIsParsing(false);
      }
    },
    [loadDashboard, loadStatements, router]
  );

  const hasStatements = Boolean(statements && statements.length > 0);
  const showTabs = hasStatements && !isLoadingDashboard;
  const showEmptyUpload =
    !isLoadingDashboard && statements !== null && statements.length === 0 && !isParsing;

  return (
    <main
      className="page-container dashboard-shell"
      style={{ paddingTop: '24px', paddingBottom: '40px' }}
    >
      <DashboardBrandBar />

      {showTabs && (
        <DashboardNav
          active={tab}
          onChange={(t) => {
            setTab(t);
            if (t !== 'upload') {
              setError(null);
            }
          }}
        />
      )}

      {isLoadingDashboard && !isParsing && <DashboardLoadingSkeleton />}

      {isParsing && <ParsingPanel />}

      {showEmptyUpload && (
        <UploadPanel
          error={error}
          statementType={statementType}
          onStatementTypeChange={setStatementType}
          onUpload={handleUpload}
        />
      )}

      {hasStatements && tab === 'upload' && !isLoadingDashboard && !isParsing && (
        <UploadPanel
          error={error}
          statementType={statementType}
          onStatementTypeChange={setStatementType}
          onUpload={handleUpload}
        />
      )}

      {tab === 'overview' &&
        hasStatements &&
        result &&
        !isLoadingDashboard &&
        !isParsing &&
        statements && (
          <>
            <StatementFilters
              statements={statements}
              selectedStatementId={effectiveSelectedId}
              monthFilter={monthFilter}
              onMonthChange={handleMonthChange}
              onStatementChange={handleStatementChange}
            />
            <ResultsPanel
              institution_name={result.institution_name}
              statement_type={result.statement_type}
              period_start={result.period_start}
              period_end={result.period_end}
              due_date={result.due_date}
              payment_due_paisa={result.payment_due_paisa}
              minimum_due_paisa={result.minimum_due_paisa}
              credit_limit_paisa={result.credit_limit_paisa}
              transaction_count={result.transaction_count}
              summary={result.summary}
              perceived_spend_paisa={result.perceived_spend_paisa}
              nickname={result.nickname}
              account_purpose={result.account_purpose}
              card_network={result.card_network}
            />
          </>
        )}

      {tab === 'insights' && hasStatements && result && !isLoadingDashboard && !isParsing && (
        <InsightsPanel advisories={advisories} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
