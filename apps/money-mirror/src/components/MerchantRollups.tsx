'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { TxnScope } from '@/app/dashboard/TransactionsPanel';
import { MerchantRenameDialog } from './MerchantRenameDialog';
type MerchantRow = {
  merchant_key: string;
  display_label: string;
  debit_paisa: number;
  txn_count: number;
  suggested_label: string | null;
  suggestion_confidence: number | null;
};

export type RenameTarget = {
  merchantKey: string;
  draft: string;
  suggestedLabel: string | null;
};

function formatInr(paisa: number): string {
  const rupees = Math.abs(paisa) / 100;
  return rupees.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function merchantsQuery(txnScope: TxnScope): string {
  const q = new URLSearchParams();
  if (txnScope.mode === 'legacy') {
    q.set('statement_id', txnScope.statementId);
  } else {
    q.set('date_from', txnScope.dateFrom);
    q.set('date_to', txnScope.dateTo);
    if (txnScope.statementIds?.length) {
      q.set('statement_ids', txnScope.statementIds.join(','));
    }
  }
  q.set('limit', '12');
  return q.toString();
}

interface MerchantRollupsProps {
  txnScope: TxnScope;
}

export function MerchantRollups({ txnScope }: MerchantRollupsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<MerchantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rename, setRename] = useState<RenameTarget | null>(null);
  const [renameBusy, setRenameBusy] = useState(false);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const loadAbortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    loadAbortRef.current?.abort();
    const ac = new AbortController();
    loadAbortRef.current = ac;
    setLoading(true);
    setError(null);
    try {
      const qs = merchantsQuery(txnScope);
      const resp = await fetch(`/api/insights/merchants?${qs}`, { signal: ac.signal });
      if (!resp.ok) {
        const body = (await resp.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
          code?: string;
        };
        const base = body.error ?? `Load failed (${resp.status})`;
        if (body.code === 'SCHEMA_DRIFT' && body.detail) {
          throw new Error(body.detail);
        }
        const showDetail = process.env.NODE_ENV === 'development' && body.detail;
        throw new Error(showDetail ? `${base}: ${body.detail}` : base);
      }
      const data = (await resp.json()) as {
        merchants: MerchantRow[];
      };
      if (!ac.signal.aborted) {
        setRows(data.merchants ?? []);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
      setError(e instanceof Error ? e.message : 'Failed to load merchants.');
      setRows([]);
    } finally {
      if (loadAbortRef.current === ac) {
        setLoading(false);
      }
    }
  }, [txnScope]);

  useEffect(() => {
    void load();
    return () => {
      loadAbortRef.current?.abort();
    };
  }, [load]);

  useEffect(() => {
    if (rename && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [rename]);

  const saveRename = async () => {
    if (!rename) {
      return;
    }
    const label = rename.draft.trim();
    if (label.length < 1) {
      return;
    }
    setRenameBusy(true);
    try {
      const resp = await fetch('/api/merchants/alias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_key: rename.merchantKey, display_label: label }),
      });
      if (!resp.ok) {
        const body = (await resp.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'Save failed');
      }
      setRename(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save name.');
    } finally {
      setRenameBusy(false);
    }
  };

  const acceptSuggestion = async (merchantKey: string) => {
    setRenameBusy(true);
    try {
      const resp = await fetch('/api/merchants/suggest-accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_key: merchantKey }),
      });
      if (!resp.ok) {
        const body = (await resp.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'Could not apply suggestion');
      }
      setRename(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not apply suggestion.');
    } finally {
      setRenameBusy(false);
    }
  };

  const onSeeTransactions = (merchantKey: string) => {
    void fetch('/api/insights/merchant-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant_key: merchantKey }),
    }).catch(() => {});

    const q = new URLSearchParams(searchParams.toString());
    q.set('tab', 'transactions');
    q.set('merchant_key', merchantKey);
    router.push(`/dashboard?${q.toString()}`);
  };

  return (
    <section
      aria-label="Top merchants"
      style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
    >
      {rename ? (
        <MerchantRenameDialog
          rename={rename}
          renameBusy={renameBusy}
          renameInputRef={renameInputRef}
          onChange={(draft) => setRename({ ...rename, draft })}
          onClose={() => setRename(null)}
          onSave={() => void saveRename()}
          onAcceptSuggestion={(key) => void acceptSuggestion(key)}
        />
      ) : null}
      <div>
        <h2
          style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            margin: 0,
          }}
        >
          Top merchants
        </h2>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.78rem',
            margin: '6px 0 0',
            lineHeight: 1.45,
          }}
        >
          Debit spend by normalized merchant label for this scope. Tap to open matching
          transactions.
        </p>
      </div>

      {loading && (
        <div
          className="skeleton"
          style={{ width: '100%', height: '120px', borderRadius: '14px' }}
        />
      )}

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }} role="alert">
          {error}
        </p>
      )}

      {!loading && !error && rows.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No labeled merchants in this scope yet. Upload statements or run merchant key backfill.
        </p>
      )}

      {rows.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {rows.map((r) => (
            <li
              key={r.merchant_key}
              style={{
                borderRadius: '14px',
                border: '1px solid var(--border)',
                padding: '12px 14px',
                background: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, wordBreak: 'break-word' }}>{r.display_label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {r.txn_count} debit{r.txn_count === 1 ? '' : 's'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                  ₹{formatInr(r.debit_paisa)}
                </span>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                  onClick={() =>
                    setRename({
                      merchantKey: r.merchant_key,
                      draft: r.display_label,
                      suggestedLabel: r.suggested_label,
                    })
                  }
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                  onClick={() => onSeeTransactions(r.merchant_key)}
                >
                  See transactions
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
