'use client';

import { useState } from 'react';
import type { FrequencyMerchantRow } from '@/lib/dashboard-helpers';
import type { ClusterRollup } from '@/lib/merchant-clusters';
import { formatMerchantKeyForDisplay } from '@/lib/merchant-normalize';

export function FrequencyClusterSection({
  topMerchants,
  clusters,
  loading,
  onClusterClick,
  onFrequencyOpen,
}: {
  topMerchants: FrequencyMerchantRow[];
  clusters: ClusterRollup[];
  loading: boolean;
  onClusterClick: (c: ClusterRollup) => void;
  onFrequencyOpen: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="card" style={{ padding: '16px' }}>
        <div className="skeleton" style={{ height: '14px', width: '50%', borderRadius: '4px' }} />
        <div
          className="skeleton"
          style={{ height: '14px', width: '70%', borderRadius: '4px', marginTop: '10px' }}
        />
      </div>
    );
  }

  if (topMerchants.length === 0 && clusters.length === 0) return null;

  const top5 = topMerchants.slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {clusters.length > 0 && (
        <div>
          <h2
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: '0 0 10px',
            }}
          >
            Spending clusters
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {clusters.map((c) => (
              <button
                key={c.cluster.id}
                type="button"
                onClick={() => onClusterClick(c)}
                className="card"
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{c.cluster.label}</span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      marginTop: '2px',
                    }}
                  >
                    {c.debitCount} orders • ₹
                    {Math.round(c.totalDebitPaisa / 100).toLocaleString('en-IN')}
                  </span>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {top5.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => {
              setExpanded((v) => !v);
              if (!expanded) onFrequencyOpen();
            }}
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: '0 0 10px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Most frequent merchants
            <span style={{ fontSize: '0.7rem' }}>{expanded ? '▲' : '▼'}</span>
          </button>

          {expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {top5.map((m) => (
                <div
                  key={m.merchant_key}
                  className="card"
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                    {formatMerchantKeyForDisplay(m.merchant_key)}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {m.debit_count}× • ₹{Math.round(m.debit_paisa / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
