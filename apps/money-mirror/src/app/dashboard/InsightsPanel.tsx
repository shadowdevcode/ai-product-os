'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdvisoryFeed } from '@/components/AdvisoryFeed';
import { MerchantRollups } from '@/components/MerchantRollups';
import type { Advisory } from '@/lib/advisory-engine';
import type { LayerAFacts } from '@/lib/coaching-facts';
import {
  FREQUENCY_INSIGHT_OPENED,
  MERCHANT_CLUSTER_CLICKED,
  getPosthogBrowser,
} from '@/lib/posthog-browser';
import type { FrequencyMerchantRow } from '@/lib/dashboard-helpers';
import type { ClusterRollup } from '@/lib/merchant-clusters';
import type { TxnScope } from './TransactionsPanel';
import { FrequencyClusterSection } from './FrequencyClusterSection';

interface InsightsPanelProps {
  advisories: Advisory[];
  txnScope: TxnScope | null;
  coachingFacts: LayerAFacts | null;
  isLoadingNarratives?: boolean;
  onAdvisoryFeedRendered?: (payload: { advisory_count: number }) => void;
}

function buildScopeParams(scope: TxnScope): string {
  if (scope.mode === 'unified') {
    const q = new URLSearchParams();
    q.set('date_from', scope.dateFrom);
    q.set('date_to', scope.dateTo);
    if (scope.statementIds?.length) q.set('statement_ids', scope.statementIds.join(','));
    return `?${q.toString()}`;
  }
  return `?statement_id=${scope.mode === 'legacy' ? scope.statementId : ''}`;
}

export function InsightsPanel({
  advisories,
  txnScope,
  coachingFacts,
  isLoadingNarratives = false,
  onAdvisoryFeedRendered,
}: InsightsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [topMerchants, setTopMerchants] = useState<FrequencyMerchantRow[]>([]);
  const [clusters, setClusters] = useState<ClusterRollup[]>([]);
  const [freqLoading, setFreqLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fetchedScopeRef = useRef<string | null>(null);
  const advisoryRenderedScopeRef = useRef<string | null>(null);

  const scopeKey = txnScope ? JSON.stringify(txnScope) : null;

  const loadFrequencyData = useCallback(async () => {
    if (!txnScope || txnScope.mode !== 'unified') return;
    const key = JSON.stringify(txnScope);
    if (fetchedScopeRef.current === key) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setFreqLoading(true);

    try {
      const params = buildScopeParams(txnScope);
      const resp = await fetch(`/api/insights/frequency-clusters${params}`, { signal: ac.signal });
      if (!resp.ok) return;
      const data = await resp.json();
      setTopMerchants(data.top_merchants ?? []);
      setClusters(data.clusters ?? []);
      fetchedScopeRef.current = key;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
    } finally {
      setFreqLoading(false);
    }
  }, [txnScope]);

  useEffect(() => {
    fetchedScopeRef.current = null;
  }, [scopeKey]);

  useEffect(() => {
    if (!scopeKey || !txnScope || !onAdvisoryFeedRendered) {
      return;
    }
    if (advisories.length === 0 && isLoadingNarratives) {
      return;
    }
    if (advisoryRenderedScopeRef.current === scopeKey) {
      return;
    }
    advisoryRenderedScopeRef.current = scopeKey;
    onAdvisoryFeedRendered({ advisory_count: advisories.length });
  }, [advisories.length, isLoadingNarratives, onAdvisoryFeedRendered, scopeKey, txnScope]);

  useEffect(() => {
    void loadFrequencyData();
  }, [loadFrequencyData]);

  const handleClusterClick = (cluster: ClusterRollup) => {
    void getPosthogBrowser().then((ph) => {
      if (!ph) return;
      ph.capture(MERCHANT_CLUSTER_CLICKED, {
        cluster_id: cluster.cluster.id,
        cluster_label: cluster.cluster.label,
        merchant_count: cluster.merchantKeys.length,
      });
    });
    const q = new URLSearchParams(searchParams.toString());
    q.set('tab', 'transactions');
    q.delete('merchant_key');
    q.set('merchant_keys', cluster.merchantKeys.join(','));
    router.push(`/dashboard?${q.toString()}`);
  };

  const handleFrequencyOpen = () => {
    void getPosthogBrowser().then((ph) => {
      if (!ph) return;
      ph.capture(FREQUENCY_INSIGHT_OPENED, {
        top_merchant_count: topMerchants.length,
      });
    });
  };

  return (
    <div
      className="animate-fade-up"
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      <div>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 6px' }}>AI insights</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
          Plain-language nudges based on your statement data. Not personalised investment advice or
          a recommendation to buy or sell any product.
        </p>
      </div>

      {txnScope?.mode === 'unified' && (
        <FrequencyClusterSection
          topMerchants={topMerchants}
          clusters={clusters}
          loading={freqLoading}
          onClusterClick={handleClusterClick}
          onFrequencyOpen={handleFrequencyOpen}
        />
      )}

      {txnScope ? <MerchantRollups txnScope={txnScope} /> : null}

      <h2
        style={{
          fontSize: '0.82rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          margin: 0,
        }}
      >
        Highlights
      </h2>
      {isLoadingNarratives && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
          Polishing insight copy…
        </p>
      )}
      <AdvisoryFeed advisories={advisories} coachingFacts={coachingFacts} />

      <p
        style={{
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          lineHeight: 1.55,
          margin: 0,
          padding: '14px 16px',
          background: 'var(--bg-elevated)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
        }}
      >
        MoneyMirror is educational. For tax, legal, or investment decisions, speak to a qualified
        professional. Insights are generated from your statement patterns, not tailored advice.
      </p>
    </div>
  );
}
