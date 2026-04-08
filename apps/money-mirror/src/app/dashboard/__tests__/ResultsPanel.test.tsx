import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResultsPanel } from '@/app/dashboard/ResultsPanel';

describe('ResultsPanel comparison copy', () => {
  it('uses previous-period language and shows both compared ranges', () => {
    render(
      <ResultsPanel
        institution_name="HDFC"
        statement_type="bank_account"
        period_start="2026-03-01"
        period_end="2026-03-31"
        due_date={null}
        payment_due_paisa={null}
        minimum_due_paisa={null}
        credit_limit_paisa={null}
        transaction_count={12}
        summary={{
          needs_paisa: 100,
          wants_paisa: 200,
          investment_paisa: 300,
          debt_paisa: 400,
          other_paisa: 500,
          total_debits_paisa: 150000,
          total_credits_paisa: 100000,
        }}
        perceived_spend_paisa={120000}
        nickname={null}
        account_purpose={null}
        card_network={null}
        monthCompare={{
          current: {
            date_from: '2026-03-01',
            date_to: '2026-03-31',
            total_debits_paisa: 150000,
            total_credits_paisa: 100000,
          },
          previous: {
            date_from: '2026-02-01',
            date_to: '2026-02-28',
            total_debits_paisa: 120000,
            total_credits_paisa: 90000,
          },
          delta: {
            debits_paisa: 30000,
            credits_paisa: 10000,
            debits_pct: 25,
            credits_pct: 11.11,
          },
        }}
      />
    );

    expect(screen.getByText('Previous period')).toBeTruthy();
    expect(screen.queryByText('Month-over-month')).toBeNull();
    expect(screen.getByText('1 Mar 2026 – 31 Mar 2026 vs 1 Feb 2026 – 28 Feb 2026')).toBeTruthy();
  });
});
