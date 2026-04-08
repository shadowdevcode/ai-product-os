import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InsightsPanel } from '@/app/dashboard/InsightsPanel';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams('tab=insights'),
}));

vi.mock('@/lib/posthog-browser', () => ({
  getPosthogBrowser: vi.fn(async () => null),
  FREQUENCY_INSIGHT_OPENED: 'frequency_insight_opened',
  MERCHANT_CLUSTER_CLICKED: 'merchant_cluster_clicked',
}));

vi.mock('@/components/AdvisoryFeed', () => ({
  AdvisoryFeed: () => <div data-testid="advisory-feed" />,
}));

vi.mock('@/components/MerchantRollups', () => ({
  MerchantRollups: () => <div data-testid="merchant-rollups" />,
}));

vi.mock('@/app/dashboard/FrequencyClusterSection', () => ({
  FrequencyClusterSection: ({
    clusters,
    onClusterClick,
  }: {
    clusters: Array<{
      cluster: { id: string; label: string };
      merchantKeys: string[];
    }>;
    onClusterClick: (cluster: {
      cluster: { id: string; label: string };
      merchantKeys: string[];
    }) => void;
  }) =>
    clusters.length > 0 ? (
      <button type="button" onClick={() => onClusterClick(clusters[0])}>
        Open cluster
      </button>
    ) : null,
}));

describe('InsightsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports the first advisory render when the feed or empty state is actually visible', async () => {
    const onAdvisoryFeedRendered = vi.fn();

    const { rerender } = render(
      <InsightsPanel
        advisories={[]}
        txnScope={{
          mode: 'unified',
          dateFrom: '2026-04-01',
          dateTo: '2026-04-30',
          statementIds: null,
        }}
        coachingFacts={null}
        isLoadingNarratives
        onAdvisoryFeedRendered={onAdvisoryFeedRendered}
      />
    );

    expect(onAdvisoryFeedRendered).not.toHaveBeenCalled();

    rerender(
      <InsightsPanel
        advisories={[]}
        txnScope={{
          mode: 'unified',
          dateFrom: '2026-04-01',
          dateTo: '2026-04-30',
          statementIds: null,
        }}
        coachingFacts={null}
        isLoadingNarratives={false}
        onAdvisoryFeedRendered={onAdvisoryFeedRendered}
      />
    );

    await waitFor(() => {
      expect(onAdvisoryFeedRendered).toHaveBeenCalledWith({ advisory_count: 0 });
    });

    rerender(
      <InsightsPanel
        advisories={[
          {
            id: 'adv-1',
            trigger: 'TEST',
            severity: 'info',
            headline: 'Headline',
            message: 'Message',
          },
        ]}
        txnScope={{
          mode: 'unified',
          dateFrom: '2026-04-01',
          dateTo: '2026-04-30',
          statementIds: null,
        }}
        coachingFacts={null}
        onAdvisoryFeedRendered={onAdvisoryFeedRendered}
      />
    );

    expect(onAdvisoryFeedRendered).toHaveBeenCalledTimes(1);
  });

  it('drills through clusters using all merchant keys', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              top_merchants: [],
              clusters: [
                {
                  cluster: {
                    id: 'food_delivery',
                    label: 'Food delivery',
                    description: 'Restaurant and food ordering platforms',
                  },
                  totalDebitPaisa: 1500,
                  debitCount: 3,
                  merchantKeys: ['blinkit', 'instamart'],
                },
              ],
            }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }
          )
      )
    );

    render(
      <InsightsPanel
        advisories={[]}
        txnScope={{
          mode: 'unified',
          dateFrom: '2026-04-01',
          dateTo: '2026-04-30',
          statementIds: null,
        }}
        coachingFacts={null}
      />
    );

    const button = await screen.findByRole('button', { name: 'Open cluster' });
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledTimes(1);
    const pushed = mockPush.mock.calls[0]?.[0] as string;
    const url = new URL(pushed, 'http://localhost');
    expect(url.pathname).toBe('/dashboard');
    expect(url.searchParams.get('tab')).toBe('transactions');
    expect(url.searchParams.get('merchant_keys')).toBe('blinkit,instamart');
    expect(url.searchParams.get('merchant_key')).toBeNull();
  });
});
