'use client';

import { useCallback } from 'react';
import { type Product } from '@/lib/catalog/NykaaCatalogClient';

const MAX_INTENT_ENTRIES = 3;
const STORAGE_KEY = 'nykaa_intent_clicks';

interface IntentEntry {
  productId: string;
  brandId: string;
  categoryId: string;
  ts: number;
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sessionId = sessionStorage.getItem('nykaa_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('nykaa_session_id', sessionId);
  }
  return sessionId;
}

function storeIntentClick(product: Product): void {
  if (typeof window === 'undefined') return;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  let entries: IntentEntry[] = [];
  try {
    entries = raw ? JSON.parse(raw) : [];
  } catch {
    entries = [];
  }

  entries.push({
    productId: product.id,
    brandId: product.brandId,
    categoryId: product.categoryId,
    ts: Date.now(),
  });

  // FIFO: keep only last N entries
  const trimmed = entries.slice(-MAX_INTENT_ENTRIES);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function useIntentTracker(authToken: string) {
  const trackClick = useCallback(
    (product: Product) => {
      storeIntentClick(product);

      // Fire-and-forget to ingest-event API (async, not awaited by UI)
      const sessionId = getSessionId();
      fetch('/api/personalisation/ingest-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: product.id,
          brandId: product.brandId,
          categoryId: product.categoryId,
          sessionId,
        }),
      }).catch((e) => console.error('[intent-tracker] ingest failed:', e));
    },
    [authToken]
  );

  return { trackClick };
}
