'use client';

/**
 * Side-by-side perceived vs actual monthly debit total (Mirror moment on dashboard).
 */

interface PerceivedActualMirrorProps {
  perceived_spend_paisa: number;
  actual_debits_paisa: number;
}

export function PerceivedActualMirror({
  perceived_spend_paisa,
  actual_debits_paisa,
}: PerceivedActualMirrorProps) {
  const perceived = Math.round(perceived_spend_paisa / 100).toLocaleString('en-IN');
  const actual = Math.round(actual_debits_paisa / 100).toLocaleString('en-IN');
  const gap = actual_debits_paisa - perceived_spend_paisa;
  const gapLabel =
    gap === 0
      ? 'No gap'
      : gap > 0
        ? `You spent ₹${Math.round(gap / 100).toLocaleString('en-IN')} more than you thought`
        : `You spent ₹${Math.round(-gap / 100).toLocaleString('en-IN')} less than you thought`;

  return (
    <div
      className="card animate-fade-up"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '14px',
        padding: '18px 16px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '8px',
          }}
        >
          You thought
        </div>
        <div
          style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            fontFamily: 'Space Grotesk, sans-serif',
            color: 'var(--text-secondary)',
          }}
        >
          ₹{perceived_spend_paisa > 0 ? perceived : '—'}
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '8px',
          }}
        >
          Statement shows
        </div>
        <div
          style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            fontFamily: 'Space Grotesk, sans-serif',
            color: 'var(--danger)',
          }}
        >
          ₹{actual}
        </div>
      </div>
      {perceived_spend_paisa > 0 && (
        <div
          style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            paddingTop: '4px',
            borderTop: '1px solid var(--border)',
          }}
        >
          {gapLabel}
        </div>
      )}
    </div>
  );
}
