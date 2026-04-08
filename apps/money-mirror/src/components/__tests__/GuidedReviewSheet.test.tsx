import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GuidedReviewSheet } from '@/components/GuidedReviewSheet';

vi.mock('@/lib/posthog-browser', () => ({
  getPosthogBrowser: vi.fn(async () => null),
  GUIDED_REVIEW_STARTED: 'guided_review_started',
}));

describe('GuidedReviewSheet', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps step 3 open and shows inline error when outcome API returns non-2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: 'save_failed' }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          })
      )
    );

    render(<GuidedReviewSheet open onClose={vi.fn()} statementId="stmt_123" />);

    fireEvent.click(screen.getByRole('button', { name: "I'm ready" }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        "Couldn't save yet. Please try again."
      );
    });

    expect(screen.getByText('Wrap up')).toBeTruthy();
    expect(screen.queryByText('Review complete')).toBeNull();
  });
});
