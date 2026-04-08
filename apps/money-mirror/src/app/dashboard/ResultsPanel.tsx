'use client';

import { useRef } from 'react';
import { MirrorCard } from '@/components/MirrorCard';
import { PaywallPrompt } from '@/components/PaywallPrompt';
import { PerceivedActualMirror } from '@/components/PerceivedActualMirror';
import { formatPeriodRange, statementMonthLabel } from '@/lib/format-date';
import { getCreditsLabel, getStatementTypeLabel, type StatementType } from '@/lib/statements';
import type { UserPlan } from '@/lib/user-plan';
import {
  CreditCardDetailsGrid,
  PreviousPeriodCard,
  ShareSection,
  SummaryStatCards,
  type MonthCompare,
} from './results-panel-sections';

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
  /** P4-G: from `GET /api/dashboard`; defaults to free in UI. */
  userPlan?: UserPlan;
  /** When `true`, soft paywall may show after mirror section is visible (`NEXT_PUBLIC_PAYWALL_PROMPT_ENABLED=1`). */
  paywallFeatureEnabled?: boolean;
  monthCompare?: MonthCompare | null;
  isLoadingMonthCompare?: boolean;
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
  userPlan = 'free',
  paywallFeatureEnabled = false,
  monthCompare = null,
  isLoadingMonthCompare = false,
}: ResultsPanelProps) {
  const mirrorSectionRef = useRef<HTMLDivElement>(null);
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

      <div ref={mirrorSectionRef}>
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
      </div>

      <PaywallPrompt
        anchorRef={mirrorSectionRef}
        userPlan={userPlan}
        featureEnabled={paywallFeatureEnabled}
      />

      <SummaryStatCards
        totalSpent={totalSpent}
        totalIncome={totalIncome}
        creditsLabel={creditsLabel}
      />

      <PreviousPeriodCard
        monthCompare={monthCompare}
        isLoadingMonthCompare={isLoadingMonthCompare}
      />

      {statement_type === 'credit_card' && (
        <CreditCardDetailsGrid
          payment_due_paisa={payment_due_paisa}
          minimum_due_paisa={minimum_due_paisa}
          due_date={due_date}
          credit_limit_paisa={credit_limit_paisa}
        />
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

      <ShareSection totalSpent={totalSpent} />
    </div>
  );
}
