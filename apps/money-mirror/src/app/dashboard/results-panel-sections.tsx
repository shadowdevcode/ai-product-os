'use client';

import { formatPeriodRange, formatStatementDate } from '@/lib/format-date';

export interface MonthCompare {
  current: {
    date_from: string;
    date_to: string;
    total_debits_paisa: number;
    total_credits_paisa: number;
  };
  previous: {
    date_from: string;
    date_to: string;
    total_debits_paisa: number;
    total_credits_paisa: number;
  };
  delta: {
    debits_paisa: number;
    credits_paisa: number;
    debits_pct: number | null;
    credits_pct: number | null;
  };
}

function formatAmount(paisa: number): string {
  return Math.round(paisa / 100).toLocaleString('en-IN');
}

export function SummaryStatCards({
  totalSpent,
  totalIncome,
  creditsLabel,
}: {
  totalSpent: string;
  totalIncome: string;
  creditsLabel: string;
}) {
  return (
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
            fontFamily: 'var(--font-space), sans-serif',
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
          {creditsLabel}
        </div>
        <div
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            fontFamily: 'var(--font-space), sans-serif',
            color: 'var(--success)',
          }}
        >
          ₹{totalIncome}
        </div>
      </div>
    </div>
  );
}

export function PreviousPeriodCard({
  monthCompare,
  isLoadingMonthCompare,
}: {
  monthCompare: MonthCompare | null;
  isLoadingMonthCompare: boolean;
}) {
  const compareDebitsDelta = monthCompare?.delta.debits_paisa ?? 0;
  const compareCreditsDelta = monthCompare?.delta.credits_paisa ?? 0;
  const compareDebitsSign = compareDebitsDelta > 0 ? '+' : '';
  const compareCreditsSign = compareCreditsDelta > 0 ? '+' : '';
  const currentCompareRange = monthCompare
    ? formatPeriodRange(monthCompare.current.date_from, monthCompare.current.date_to)
    : null;
  const previousCompareRange = monthCompare
    ? formatPeriodRange(monthCompare.previous.date_from, monthCompare.previous.date_to)
    : null;

  return (
    <div className="card" style={{ padding: '14px' }}>
      <h2
        style={{
          fontSize: '0.82rem',
          fontWeight: 700,
          margin: '0 0 8px',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--text-muted)',
        }}
      >
        Previous period
      </h2>
      {isLoadingMonthCompare ? (
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Loading comparison...
        </p>
      ) : !monthCompare ? (
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Comparison unavailable for this scope.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.76rem',
              color: 'var(--text-muted)',
              lineHeight: 1.45,
            }}
          >
            {currentCompareRange} vs {previousCompareRange}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Spend change
              </p>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--danger)' }}>
                {compareDebitsSign}₹{formatAmount(compareDebitsDelta)}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Credits change
              </p>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--success)' }}>
                {compareCreditsSign}₹{formatAmount(compareCreditsDelta)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CreditCardDetailsGrid({
  payment_due_paisa,
  minimum_due_paisa,
  due_date,
  credit_limit_paisa,
}: {
  payment_due_paisa: number | null;
  minimum_due_paisa: number | null;
  due_date: string | null;
  credit_limit_paisa: number | null;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
      {payment_due_paisa !== null && (
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Payment Due
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>
            ₹{formatAmount(payment_due_paisa)}
          </div>
        </div>
      )}
      {minimum_due_paisa !== null && (
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Minimum Due
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>
            ₹{formatAmount(minimum_due_paisa)}
          </div>
        </div>
      )}
      {due_date && (
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Due Date
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>{formatStatementDate(due_date)}</div>
        </div>
      )}
      {credit_limit_paisa !== null && (
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Credit Limit
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>
            ₹{formatAmount(credit_limit_paisa)}
          </div>
        </div>
      )}
    </div>
  );
}

export function ShareSection({ totalSpent }: { totalSpent: string }) {
  return (
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
          Share My Mirror
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
  );
}
