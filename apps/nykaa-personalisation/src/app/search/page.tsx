'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSearch } from '@/lib/hooks/useSearch';
import { useIntentTracker } from '@/components/personalisation/useIntentTracker';
import { ProductCard } from '@/components/ProductCard';
import { type Product } from '@/lib/catalog/NykaaCatalogClient';
import { Search, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const DEMO_USERS = [
  { id: 'user-001', name: 'Priya' },
  { id: 'user-002', name: 'Arjun' },
  { id: 'user-003', name: 'Meera' },
  { id: 'user-004', name: 'Rahul' },
  { id: 'user-005', name: 'Ananya' },
];

function SearchPageContent() {
  const searchParams = useSearchParams();
  const userParam = searchParams.get('user');
  const activeUser = DEMO_USERS.find((u) => u.id === userParam) ?? DEMO_USERS[0];
  const authToken = btoa(JSON.stringify({ userId: activeUser.id }));
  const { results, loading, query, reranked, search } = useSearch(authToken);
  const { trackClick } = useIntentTracker(authToken);
  const [inputValue, setInputValue] = useState('');

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      search(inputValue);
    },
    [inputValue, search]
  );

  const handleProductClick = useCallback(
    (product: Product) => {
      trackClick(product);
      // Single emission source: client-side add_to_cart would be handled on PDP, not here
    },
    [trackClick]
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('page_viewed', { page: 'search' });
    }
  }, []);

  return (
    <main className="app-container">
      <div className="search-header">
        <Link href="/" className="back-link">
          <ArrowLeft size={20} />
        </Link>
        <form onSubmit={handleSearch} className="search-form">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search dresses, sneakers, makeup…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />
        </form>
      </div>

      {loading && (
        <div className="search-loading">
          <Loader2 className="spin" size={24} />
          <p>Searching…</p>
        </div>
      )}

      {!loading && query && (
        <div className="search-results-header">
          <p>
            {results.length} results for &quot;{query}&quot;
            {reranked && <span className="reranked-badge">✨ Personalised</span>}
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="search-results-grid">
          {results.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              position={index}
              userId={activeUser.id}
              onClick={() => handleProductClick(product)}
            />
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <div className="search-empty">
          <p>No products found for &quot;{query}&quot;</p>
        </div>
      )}
    </main>
  );
}

// Suspense boundary required by Next.js for useSearchParams()
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="app-container">
          <div className="search-loading">
            <Loader2 className="spin" size={24} />
            <p>Loading…</p>
          </div>
        </main>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
