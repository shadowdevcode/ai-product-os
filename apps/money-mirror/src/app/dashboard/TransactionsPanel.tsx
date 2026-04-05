'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TxnFilterBar } from './TxnFilterBar';
import { TxnRow, type TxRow } from './TxnRow';

const PAGE = 40;

export type TxnScope =
  | { mode: 'legacy'; statementId: string }
  | {
      mode: 'unified';
      dateFrom: string;
      dateTo: string;
      /** `null` = all statements (same as dashboard "all accounts") */
      statementIds: string[] | null;
    };

interface TransactionsPanelProps {
  txnScope: TxnScope;
}

export function TransactionsPanel({ txnScope }: TransactionsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const merchantFromUrl = searchParams.get('merchant_key')?.trim() ?? '';
  const [rows, setRows] = useState<TxRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 320);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('mm_txn_view_logged') === '1') {
        return;
      }
      sessionStorage.setItem('mm_txn_view_logged', '1');
    } catch {
      /* ignore */
    }
    void fetch('/api/transactions/view-opened', { method: 'POST' }).catch(() => {});
  }, []);

  const load = useCallback(
    async (nextOffset: number, append: boolean) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      setError(null);

      const q = new URLSearchParams();
      q.set('limit', String(PAGE));
      q.set('offset', String(nextOffset));
      if (txnScope.mode === 'legacy') {
        q.set('statement_id', txnScope.statementId);
      } else {
        q.set('date_from', txnScope.dateFrom);
        q.set('date_to', txnScope.dateTo);
        if (txnScope.statementIds?.length) {
          q.set('statement_ids', txnScope.statementIds.join(','));
        }
      }
      if (category) q.set('category', category);
      if (type) q.set('type', type);
      if (debouncedSearch) q.set('search', debouncedSearch);
      if (merchantFromUrl) q.set('merchant_key', merchantFromUrl);

      try {
        const resp = await fetch(`/api/transactions?${q.toString()}`, { signal: ac.signal });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(body.error ?? `Load failed (${resp.status})`);
        }
        const data = (await resp.json()) as { transactions: TxRow[]; total: number };
        setTotal(data.total);
        setRows((r) => (append ? [...r, ...data.transactions] : data.transactions));
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Failed to load transactions.');
        if (!append) setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [txnScope, category, type, debouncedSearch, merchantFromUrl]
  );

  useEffect(() => {
    if (txnScope.mode === 'legacy' && !txnScope.statementId) return;
    if (txnScope.mode === 'unified' && (!txnScope.dateFrom || !txnScope.dateTo)) return;
    void load(0, false);
  }, [txnScope, category, type, debouncedSearch, merchantFromUrl, load]);

  const clearMerchantFilter = useCallback(() => {
    const q = new URLSearchParams(searchParams.toString());
    q.delete('merchant_key');
    router.replace(`/dashboard?${q.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const hasMore = rows.length < total;

  return (
    <section
      aria-label="Transactions"
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
    >
      <TxnFilterBar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        type={type}
        onTypeChange={setType}
        merchantFromUrl={merchantFromUrl}
        onClearMerchant={clearMerchantFilter}
      />

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }} role="alert">
          {error}
        </p>
      )}

      {loading && rows.length === 0 && (
        <div
          className="skeleton"
          style={{ width: '100%', height: '160px', borderRadius: '14px' }}
        />
      )}

      {!loading && rows.length === 0 && !error && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No transactions for this filter.
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
          {rows.map((tx) => (
            <TxnRow key={tx.id} tx={tx} />
          ))}
        </ul>
      )}

      {hasMore && (
        <button
          type="button"
          className="btn-ghost"
          style={{ width: '100%' }}
          disabled={loading}
          onClick={() => void load(rows.length, true)}
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}

      {total > 0 && (
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Showing {rows.length} of {total} transactions
        </p>
      )}
    </section>
  );
}
