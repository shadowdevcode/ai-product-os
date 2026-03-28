'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { ShelfSkeleton } from '@/components/personalisation/ShelfSkeleton';
import { type Product, EDITORIAL_PRODUCTS } from '@/lib/catalog/NykaaCatalogClient';

interface ForYouShelfProps {
  authToken: string;
  onProductClick?: (product: Product) => void;
}

export function ForYouShelf({ authToken, onProductClick }: ForYouShelfProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cohort, setCohort] = useState<string>('');
  const [isFallback, setIsFallback] = useState(false);

  const fetchShelf = useCallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 500);

    try {
      const res = await fetch('/api/personalisation/shelf', {
        headers: { Authorization: `Bearer ${authToken}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProducts(data.products ?? []);
      setCohort(data.cohort ?? '');
      setIsFallback(data.fallback ?? false);
    } catch {
      setProducts(EDITORIAL_PRODUCTS);
      setIsFallback(true);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchShelf();
  }, [fetchShelf]);

  if (loading) return <ShelfSkeleton />;

  const label = isFallback || cohort === 'default' ? 'Trending Now' : 'Picked for you';

  return (
    <section className="shelf-container">
      <div className="shelf-header">
        <h2 className="shelf-title">{label}</h2>
        <span className="shelf-subtitle">
          {isFallback ? 'Curated picks' : 'Based on your style'}
        </span>
      </div>
      <div className="shelf-scroll">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            position={index}
            onClick={() => onProductClick?.(product)}
          />
        ))}
      </div>
    </section>
  );
}
