'use client';

import { useMemo } from 'react';
import { ScopeBar } from '@/components/ScopeBar';
import { UploadPanel } from './UploadPanel';
import { ParsingPanel } from './ParsingPanel';
import { ResultsPanel } from './ResultsPanel';
import { InsightsPanel } from './InsightsPanel';
import { DashboardNav } from './DashboardNav';
import { StatementFilters } from './StatementFilters';
import { DashboardLoadingSkeleton } from './DashboardLoadingSkeleton';
import { DashboardBrandBar } from './DashboardBrandBar';
import { TransactionsPanel } from './TransactionsPanel';
import { useDashboardState, tabFromSearchParams } from './useDashboardState';

export function DashboardClient() {
  const {
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
    effectiveSelectedId,
    txnScope,
    handleMonthChange,
    handleStatementChange,
    applyUnified,
    applyLegacy,
    handleUpload,
  } = useDashboardState();

  const tab = useMemo(() => tabFromSearchParams(searchParams), [searchParams]);

  const hasStatements = Boolean(statements && statements.length > 0);
  const showTabs = hasStatements && !isLoadingDashboard;
  const showEmptyUpload =
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
            if (t === 'overview') {
              q.delete('tab');
            } else {
              q.set('tab', t);
            }
            router.replace(`/dashboard?${q.toString()}`, { scroll: false });
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

      {tab === 'overview' && scopeAndFilters && result && (
        <>
          {scopeAndFilters}
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
          />
        </>
      )}

      {tab === 'transactions' && scopeAndFilters && result && txnScope && (
        <>
          {scopeAndFilters}
          <TransactionsPanel txnScope={txnScope} />
        </>
      )}
    </main>
  );
}
