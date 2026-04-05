'use client';

import { AdvisoryFeed } from '@/components/AdvisoryFeed';
import { MerchantRollups } from '@/components/MerchantRollups';
import type { Advisory } from '@/lib/advisory-engine';
import type { LayerAFacts } from '@/lib/coaching-facts';
import type { TxnScope } from './TransactionsPanel';

interface InsightsPanelProps {
  advisories: Advisory[];
  txnScope: TxnScope | null;
  coachingFacts: LayerAFacts | null;
}

export function InsightsPanel({ advisories, txnScope, coachingFacts }: InsightsPanelProps) {
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
