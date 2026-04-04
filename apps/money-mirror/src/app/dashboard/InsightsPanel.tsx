'use client';

import { AdvisoryFeed } from '@/components/AdvisoryFeed';
import type { Advisory } from '@/lib/advisory-engine';

interface InsightsPanelProps {
  advisories: Advisory[];
}

export function InsightsPanel({ advisories }: InsightsPanelProps) {
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
      <AdvisoryFeed advisories={advisories} />

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
