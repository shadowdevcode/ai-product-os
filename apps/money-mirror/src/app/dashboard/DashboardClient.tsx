'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScopeBar } from '@/components/ScopeBar';
import { ParsingPanel } from './ParsingPanel';
import { ResultsPanel } from './ResultsPanel';
import { InsightsPanel } from './InsightsPanel';
import { DashboardNav } from './DashboardNav';
import { StatementFilters } from './StatementFilters';
import { DashboardLoadingSkeleton } from './DashboardLoadingSkeleton';
import { DashboardBrandBar } from './DashboardBrandBar';
import { TransactionsPanel } from './TransactionsPanel';
import { SyncPanel } from './SyncPanel';
import { GuidedReviewSheet } from '@/components/GuidedReviewSheet';
import { normalizeUserPlan } from '@/lib/user-plan';
import {
  DASHBOARD_READY_MS,
  TIME_TO_FIRST_ADVISORY_MS,
  getPosthogBrowser,
} from '@/lib/posthog-browser';
import { useDashboardState, tabFromSearchParams } from './useDashboardState';

export function DashboardClient() {
  const mountTimeRef = useRef(0);
  const dashboardReadyFiredRef = useRef(false);
  const advisoryReadyFiredRef = useRef(false);
  const [deferredReady, setDeferredReady] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const {
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
    effectiveSelectedId,
    txnScope,
    handleMonthChange,
    handleStatementChange,
    applyUnified,
    applyLegacy,
    handleUpload,
    loadStatements,
    loadDashboard,
  } = useDashboardState();

  const tab = useMemo(() => tabFromSearchParams(searchParams), [searchParams]);
  const paywallFeatureEnabled = process.env.NEXT_PUBLIC_PAYWALL_PROMPT_ENABLED === '1';

  // Reset SLA timers whenever the canonical dashboard scope changes so that
  // dashboard_ready_ms / time_to_first_advisory_ms reflect *current* scope —
  // not just the first mount. The timer origin moves with the scope key.
  // (deferredReady intentionally stays true once set — it gates fade-in only,
  // not telemetry, so resetting it would unmount content during scope swaps.)
  useEffect(() => {
    mountTimeRef.current = performance.now();
    dashboardReadyFiredRef.current = false;
    advisoryReadyFiredRef.current = false;
  }, [dashboardScopeKey]);

  useEffect(() => {
    if (isLoadingDashboard || !result) return;
    if (!dashboardReadyFiredRef.current) {
      dashboardReadyFiredRef.current = true;
      const durationMs = Math.round(performance.now() - mountTimeRef.current);
      void getPosthogBrowser().then((ph) => {
        if (!ph) return;
        ph.capture(DASHBOARD_READY_MS, { duration_ms: durationMs });
      });
      requestAnimationFrame(() => setDeferredReady(true));
    }
  }, [isLoadingDashboard, result]);

  const handleAdvisoryFeedRendered = useCallback(
    ({ advisory_count }: { advisory_count: number }) => {
      if (advisoryReadyFiredRef.current) {
        return;
      }
      advisoryReadyFiredRef.current = true;
      const durationMs = Math.round(performance.now() - mountTimeRef.current);
      void getPosthogBrowser().then((ph) => {
        if (!ph) return;
        ph.capture(TIME_TO_FIRST_ADVISORY_MS, {
          duration_ms: durationMs,
          advisory_count,
        });
      });
    },
    []
  );

  const handleSyncComplete = useCallback(async () => {
    await loadStatements();
    loadDashboard().catch(() => {});
  }, [loadStatements, loadDashboard]);

  const hasStatements = Boolean(statements && statements.length > 0);
  const showTabs = hasStatements && !isLoadingDashboard;
  const showEmptySync =
    !isLoadingDashboard && statements !== null && statements.length === 0 && !isParsing;

  const scopeAndFilters =
    hasStatements && result && !isLoadingDashboard && !isParsing && statements ? (
      <>
        <ScopeBar
          statements={statements}
          searchParams={searchParams}
          onApplyUnified={applyUnified}
          onApplyLegacy={applyLegacy}
        />
        {!isUnifiedUrl && (
          <StatementFilters
            statements={statements}
            selectedStatementId={effectiveSelectedId}
            monthFilter={monthFilter}
            onMonthChange={handleMonthChange}
            onStatementChange={handleStatementChange}
          />
        )}
      </>
    ) : null;

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
            const q = new URLSearchParams(searchParams.toString());
            q.set('tab', t);
            router.replace(`/dashboard?${q.toString()}`, { scroll: false });
            if (t !== 'sync') {
              setError(null);
            }
          }}
        />
      )}

      {isLoadingDashboard && !isParsing && <DashboardLoadingSkeleton />}

      {isParsing && <ParsingPanel />}

      {showEmptySync && (
        <SyncPanel
          uploadError={error}
          statementType={statementType}
          onStatementTypeChange={setStatementType}
          onUpload={handleUpload}
          onSyncComplete={handleSyncComplete}
        />
      )}

      {hasStatements && tab === 'sync' && !isLoadingDashboard && !isParsing && (
        <SyncPanel
          uploadError={error}
          statementType={statementType}
          onStatementTypeChange={setStatementType}
          onUpload={handleUpload}
          onSyncComplete={handleSyncComplete}
        />
      )}

      {tab === 'overview' && scopeAndFilters && result && (
        <>
          {scopeAndFilters}
          {deferredReady && (
            <button
              type="button"
              className="btn-ghost"
              style={{
                width: '100%',
                marginBottom: '8px',
                justifyContent: 'center',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
              onClick={() => setReviewOpen(true)}
            >
              Quick money review →
            </button>
          )}
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
            scopeKind={result.scope?.kind ?? 'single_statement'}
            perceived_is_profile_baseline={result.perceived_is_profile_baseline ?? false}
            userPlan={normalizeUserPlan(result.plan)}
            paywallFeatureEnabled={paywallFeatureEnabled}
            monthCompare={deferredReady ? (result.month_compare ?? null) : null}
            isLoadingMonthCompare={!deferredReady && Boolean(result.month_compare)}
          />
        </>
      )}

      {tab === 'insights' && scopeAndFilters && result && txnScope && (
        <>
          {scopeAndFilters}
          <InsightsPanel
            advisories={advisories}
            txnScope={txnScope}
            coachingFacts={coachingFacts}
            isLoadingNarratives={isLoadingNarratives}
            onAdvisoryFeedRendered={handleAdvisoryFeedRendered}
          />
        </>
      )}

      {tab === 'transactions' && scopeAndFilters && result && txnScope && (
        <>
          {scopeAndFilters}
          <TransactionsPanel txnScope={txnScope} />
        </>
      )}
      <GuidedReviewSheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        statementId={effectiveSelectedId}
      />
    </main>
  );
}
