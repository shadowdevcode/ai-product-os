'use client';

import { useCallback, useEffect, useState } from 'react';
import { UploadPanel, type UploadFormMeta } from './UploadPanel';
import { SyncResultCard, SyncRunHistoryList } from './SyncPanelParts';
import type { StatementType } from '@/lib/statements';

interface SyncRun {
  trigger_mode: string;
  status: string;
  emails_scanned: number;
  parsed_count: number;
  inserted_count: number;
  skipped_count: number;
  error_summary: string | null;
  created_at: string;
}

interface SyncStatus {
  runs: SyncRun[];
  has_token: boolean;
  token_status: string | null;
  last_sync_at: string | null;
}

interface SyncResult {
  ok: boolean;
  emails_scanned: number;
  parsed_count: number;
  inserted_count: number;
  skipped_count: number;
  error_summary?: string;
}

interface SyncPanelProps {
  // Upload fallback props
  uploadError: string | null;
  statementType: StatementType;
  onStatementTypeChange: (st: StatementType) => void;
  onUpload: (file: File, st: StatementType, meta: UploadFormMeta) => void;
  // Called after a successful sync so the dashboard refreshes
  onSyncComplete?: () => void;
}

export function SyncPanel({
  uploadError,
  statementType,
  onStatementTypeChange,
  onUpload,
  onSyncComplete,
}: SyncPanelProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/gmail/sync/status');
      if (res.ok) {
        setStatus((await res.json()) as SyncStatus);
      }
    } catch {
      // Non-critical — status panel just stays loading
    }
  }, []);

  useEffect(() => {
    loadStatus().catch(() => {});
  }, [loadStatus]);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncError(null);
    setLastResult(null);

    try {
      const res = await fetch('/api/gmail/trigger-sync', { method: 'POST' });
      const data = (await res.json()) as SyncResult;

      if (!res.ok) {
        setSyncError((data as unknown as { error?: string }).error ?? 'Sync failed');
      } else {
        setLastResult(data);
        await loadStatus();
        onSyncComplete?.();
      }
    } catch {
      setSyncError('Network error — please try again');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      className="animate-fade-up"
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
          Gmail Sync
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '8px 0 0' }}>
          Import transaction alerts directly from your inbox. No PDF uploads needed.
        </p>
      </div>

      {/* ── Gmail section ─────────────────────────────────────── */}
      {status === null ? (
        <div
          style={{
            padding: '32px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
          }}
        >
          Loading...
        </div>
      ) : !status.has_token ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              padding: '24px',
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📬</div>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                margin: '0 0 16px',
                lineHeight: 1.5,
              }}
            >
              Connect Gmail to auto-import HDFC, ICICI, Kotak and other bank transaction alerts.
              Works with all UPI debit/credit emails.
            </p>
            <a
              href="/api/oauth/google/start"
              className="btn-primary"
              style={{
                display: 'inline-block',
                textDecoration: 'none',
                padding: '12px 24px',
              }}
            >
              Connect Gmail
            </a>
          </div>

          {status.token_status === 'refresh_failed' && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(239,83,80,0.12)',
                color: '#ef5350',
                fontSize: '0.85rem',
              }}
            >
              Gmail connection expired. Reconnect to resume syncing.
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSync}
            disabled={isSyncing}
            style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '14px' }}
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>

          {lastResult && <SyncResultCard result={lastResult} />}

          {syncError && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(239,83,80,0.12)',
                color: '#ef5350',
                fontSize: '0.85rem',
              }}
            >
              {syncError}
            </div>
          )}

          <SyncRunHistoryList runs={status.runs} />

          <div style={{ textAlign: 'center' }}>
            <a
              href="/api/oauth/google/start"
              style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none' }}
            >
              Reconnect Gmail
            </a>
          </div>
        </div>
      )}

      {/* ── Privacy note ──────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          padding: '14px 16px',
          background: 'var(--bg-elevated)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: '1rem' }}>🔒</span>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>
          We only read transaction alert emails. Your Gmail data is never stored — only the
          extracted transaction numbers.
        </p>
      </div>

      {/* ── Upload fallback ────────────────────────────────────── */}
      <div>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setShowUpload((v) => !v)}
          style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem' }}
        >
          {showUpload ? 'Hide PDF upload' : 'Or upload a PDF statement instead'}
        </button>

        {showUpload && (
          <div style={{ marginTop: '16px' }}>
            <UploadPanel
              error={uploadError}
              statementType={statementType}
              onStatementTypeChange={onStatementTypeChange}
              onUpload={onUpload}
            />
          </div>
        )}
      </div>
    </div>
  );
}
