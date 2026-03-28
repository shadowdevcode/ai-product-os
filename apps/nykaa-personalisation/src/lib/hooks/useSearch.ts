'use client';

import { useState, useCallback, useRef } from 'react';
import { type Product } from '@/lib/catalog/NykaaCatalogClient';

export function useSearch(authToken: string) {
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [reranked, setReranked] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setQuery(q);

      try {
        const res = await fetch(`/api/personalisation/rerank?q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${authToken}` },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (controller.signal.aborted) return;

        setResults(data.results ?? []);
        setReranked(data.reranked ?? false);
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') return;
        setResults([]);
        setReranked(false);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [authToken]
  );

  return { results, loading, query, reranked, search };
}
