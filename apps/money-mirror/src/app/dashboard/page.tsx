'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Advisory } from '@/lib/advisory-engine';
import { UploadPanel } from './UploadPanel';
import { ParsingPanel } from './ParsingPanel';
import { ResultsPanel } from './ResultsPanel';

/**
 * T8a — Dashboard Page
 *
 * Three states:
 *   1. UPLOAD   → drag-and-drop PDF upload zone
 *   2. PARSING  → loading skeleton with progress text
 *   3. RESULTS  → MirrorCards breakdown + AdvisoryFeed
 */

type DashboardState = 'upload' | 'parsing' | 'results';

interface DashboardResult {
  statement_id: string;
  period_start: string | null;
  period_end: string | null;
  transaction_count: number;
  summary: {
    needs_paisa: number;
    wants_paisa: number;
    investment_paisa: number;
    debt_paisa: number;
    other_paisa: number;
    total_debits_paisa: number;
    total_credits_paisa: number;
  };
}

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState>('upload');
  const [result, setResult] = useState<DashboardResult | null>(null);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  const loadDashboard = useCallback(async (statementId: string | null) => {
    setIsLoadingDashboard(true);
    setError(null);

    try {
      const query = statementId ? `?statement_id=${encodeURIComponent(statementId)}` : '';
      const resp = await fetch(`/api/dashboard${query}`);

      if (resp.status === 404) {
        setState('upload');
        setResult(null);
        setAdvisories([]);
        return;
      }

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error ?? body.detail ?? `Dashboard load failed (${resp.status})`);
      }

      const data: DashboardResult & { advisories: Advisory[] } = await resp.json();
      setResult(data);
      setAdvisories(data.advisories);
      setState('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your dashboard.');
      setState('upload');
      setResult(null);
      setAdvisories([]);
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(null).catch(() => {
      // Error already reflected in state.
    });
  }, [loadDashboard]);

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);

      if (file.type && file.type !== 'application/pdf') {
        setError('Please upload a PDF file.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File is too large. Maximum 10 MB.');
        return;
      }

      setState('parsing');

      try {
        const formData = new FormData();
        formData.append('file', file);

        const resp = await fetch('/api/statement/parse', { method: 'POST', body: formData });

        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(body.error ?? body.detail ?? `Upload failed (${resp.status})`);
        }

        const data: DashboardResult = await resp.json();
        await loadDashboard(data.statement_id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
        setState('upload');
      }
    },
    [loadDashboard]
  );

  const resetToUpload = useCallback(() => {
    setState('upload');
    setResult(null);
    setAdvisories([]);
    setError(null);
  }, []);

  return (
    <main className="page-container" style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
        }}
      >
        <span
          style={{
            fontSize: '1.1rem',
            fontWeight: 800,
            color: 'var(--accent)',
            fontFamily: 'Space Grotesk, sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          MoneyMirror
        </span>
        {state === 'results' && (
          <button
            className="btn-ghost"
            style={{ width: 'auto', padding: '8px 16px', fontSize: '0.78rem' }}
            onClick={resetToUpload}
          >
            New Upload
          </button>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoadingDashboard && state !== 'parsing' && (
        <div
          className="animate-fade-up"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            minHeight: '240px',
          }}
        >
          <div
            className="skeleton"
            style={{ width: '100%', height: '120px', borderRadius: '18px' }}
          />
          <div
            className="skeleton"
            style={{ width: '100%', height: '120px', borderRadius: '18px' }}
          />
        </div>
      )}

      {state === 'upload' && !isLoadingDashboard && (
        <UploadPanel error={error} onUpload={handleUpload} />
      )}

      {state === 'parsing' && <ParsingPanel />}

      {state === 'results' && result && !isLoadingDashboard && (
        <ResultsPanel
          period_start={result.period_start}
          period_end={result.period_end}
          transaction_count={result.transaction_count}
          summary={result.summary}
          advisories={advisories}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
