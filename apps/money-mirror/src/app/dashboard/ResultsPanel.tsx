'use client';

import { MirrorCard } from '@/components/MirrorCard';
import { AdvisoryFeed } from '@/components/AdvisoryFeed';
import type { Advisory } from '@/lib/advisory-engine';

interface ResultSummary {
  needs_paisa: number;
  wants_paisa: number;
  investment_paisa: number;
  debt_paisa: number;
  other_paisa: number;
  total_debits_paisa: number;
  total_credits_paisa: number;
}

interface ResultsPanelProps {
  period_start: string | null;
  period_end: string | null;
  transaction_count: number;
  summary: ResultSummary;
  advisories: Advisory[];
}

const CATEGORY_META = [
  { key: 'needs_paisa' as const, label: 'Needs', color: 'var(--accent)', icon: '🏠' },
  { key: 'wants_paisa' as const, label: 'Wants', color: 'var(--warning)', icon: '🛍️' },
  { key: 'investment_paisa' as const, label: 'Investments', color: 'var(--success)', icon: '📈' },
  { key: 'debt_paisa' as const, label: 'Debt & EMIs', color: 'var(--danger)', icon: '💳' },
  { key: 'other_paisa' as const, label: 'Other', color: 'var(--text-muted)', icon: '📦' },
];

export function ResultsPanel({
  period_start,
  period_end,
  transaction_count,
  summary,
  advisories,
}: ResultsPanelProps) {
  const totalSpent = Math.round(summary.total_debits_paisa / 100).toLocaleString('en-IN');
  const totalIncome = Math.round(summary.total_credits_paisa / 100).toLocaleString('en-IN');

  return (
    <div
      className="animate-fade-up"
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 4px' }}>
          Your Money Mirror 🪞
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
          {period_start ?? 'Unknown start'} → {period_end ?? 'Unknown end'} • {transaction_count}{' '}
          transactions
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '6px',
            }}
          >
            Total Spent
          </div>
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              fontFamily: 'Space Grotesk, sans-serif',
              color: 'var(--danger)',
            }}
          >
            ₹{totalSpent}
          </div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '6px',
            }}
          >
            Total Income
          </div>
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              fontFamily: 'Space Grotesk, sans-serif',
              color: 'var(--success)',
            }}
          >
            ₹{totalIncome}
          </div>
        </div>
      </div>

      <div>
        <h2
          style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            margin: '0 0 12px',
          }}
        >
          Where it went
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {CATEGORY_META.map((cat) => (
            <MirrorCard
              key={cat.key}
              label={cat.label}
              amount_paisa={summary[cat.key]}
              total_paisa={summary.total_debits_paisa}
              color={cat.color}
              icon={cat.icon}
            />
          ))}
        </div>
      </div>

      {advisories.length > 0 && (
        <div>
          <h2
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: '0 0 12px',
            }}
          >
            Truth Bombs 💣
          </h2>
          <AdvisoryFeed advisories={advisories} />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
        {typeof navigator !== 'undefined' && navigator.share && (
          <button
            id="share-results-btn"
            className="btn-primary"
            onClick={() => {
              navigator.share({
                title: 'My MoneyMirror Results',
                text: `I just discovered where my money really goes. My spending: ₹${totalSpent}/month. Try MoneyMirror!`,
                url: window.location.origin,
              });
            }}
          >
            Share My Mirror 🪞
          </button>
        )}
        <p
          style={{
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            margin: 0,
          }}
        >
          Share anonymously — your data stays private.
        </p>
      </div>
    </div>
  );
}
