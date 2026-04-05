'use client';

import { MirrorCard } from '@/components/MirrorCard';
import { PerceivedActualMirror } from '@/components/PerceivedActualMirror';
import { formatPeriodRange, formatStatementDate, statementMonthLabel } from '@/lib/format-date';
import { getCreditsLabel, getStatementTypeLabel, type StatementType } from '@/lib/statements';

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
  institution_name: string;
  statement_type: StatementType;
  period_start: string | null;
  period_end: string | null;
  due_date: string | null;
  payment_due_paisa: number | null;
  minimum_due_paisa: number | null;
  credit_limit_paisa: number | null;
  transaction_count: number;
  summary: ResultSummary;
  perceived_spend_paisa: number;
  nickname: string | null;
  account_purpose: string | null;
  card_network: string | null;
  scopeKind?: 'single_statement' | 'unified';
  perceived_is_profile_baseline?: boolean;
}

const CATEGORY_META = [
  { key: 'needs_paisa' as const, label: 'Needs', color: 'var(--accent)', icon: '🏠' },
  { key: 'wants_paisa' as const, label: 'Wants', color: 'var(--warning)', icon: '🛍️' },
  { key: 'investment_paisa' as const, label: 'Investments', color: 'var(--success)', icon: '📈' },
  { key: 'debt_paisa' as const, label: 'Debt & EMIs', color: 'var(--danger)', icon: '💳' },
  { key: 'other_paisa' as const, label: 'Other', color: 'var(--text-muted)', icon: '📦' },
];

function purposeLabel(p: string | null): string | null {
  if (!p) {
    return null;
  }
  if (p === 'spending') {
    return 'Spending account';
  }
  if (p === 'savings_goals') {
    return 'Savings / goals';
  }
  if (p === 'unspecified') {
    return 'Purpose not set';
  }
  return null;
}

export function ResultsPanel({
  institution_name,
  statement_type,
  period_start,
  period_end,
  due_date,
  payment_due_paisa,
  minimum_due_paisa,
  credit_limit_paisa,
  transaction_count,
  summary,
  perceived_spend_paisa,
  nickname,
  account_purpose,
  card_network,
  scopeKind = 'single_statement',
  perceived_is_profile_baseline = false,
}: ResultsPanelProps) {
  const totalSpent = Math.round(summary.total_debits_paisa / 100).toLocaleString('en-IN');
  const totalIncome = Math.round(summary.total_credits_paisa / 100).toLocaleString('en-IN');
  const creditsLabel = getCreditsLabel(statement_type);
  const statementTypeLabel = getStatementTypeLabel(statement_type);
  const periodRange = formatPeriodRange(period_start, period_end);
  const periodChip = statementMonthLabel(period_end);
  const metaBits = [institution_name, statementTypeLabel];
  if (nickname?.trim()) {
    metaBits.unshift(`“${nickname.trim()}”`);
  }
  if (card_network?.trim() && statement_type === 'credit_card') {
    metaBits.push(card_network.trim());
  }
  const purpose = purposeLabel(account_purpose);

  return (
    <div
      className="animate-fade-up"
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 8px' }}>
          Your Money Mirror
        </h1>
        <p
          style={{
            display: 'inline-block',
            margin: '0 0 10px',
            padding: '4px 10px',
            borderRadius: '99px',
            fontSize: '0.72rem',
            fontWeight: 600,
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
            border: '1px solid var(--border-accent)',
          }}
        >
          {scopeKind === 'unified' ? 'Selected range' : 'Statement period'}: {periodChip}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0, lineHeight: 1.45 }}>
          {metaBits.join(' • ')} • {periodRange} • {transaction_count} transactions
        </p>
        {purpose && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '8px 0 0' }}>
            {purpose}
          </p>
        )}
      </div>

      <PerceivedActualMirror
        perceived_spend_paisa={perceived_spend_paisa}
        actual_debits_paisa={summary.total_debits_paisa}
        actualCaption={scopeKind === 'unified' ? 'Selected range shows' : 'Statement shows'}
        perceivedFootnote={
          perceived_is_profile_baseline
            ? '“You thought” is your self-reported monthly spend from onboarding (one profile estimate, not per account).'
            : null
        }
      />

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

      {statement_type === 'credit_card' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {payment_due_paisa !== null && (
            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Payment Due
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                ₹{Math.round(payment_due_paisa / 100).toLocaleString('en-IN')}
              </div>
            </div>
          )}
          {minimum_due_paisa !== null && (
            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Minimum Due
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                ₹{Math.round(minimum_due_paisa / 100).toLocaleString('en-IN')}
              </div>
            </div>
          )}
          {due_date && (
            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Due Date
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                {formatStatementDate(due_date)}
              </div>
            </div>
          )}
          {credit_limit_paisa !== null && (
            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Credit Limit
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                ₹{Math.round(credit_limit_paisa / 100).toLocaleString('en-IN')}
              </div>
            </div>
          )}
        </div>
      )}

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
    </div>
  );
}
