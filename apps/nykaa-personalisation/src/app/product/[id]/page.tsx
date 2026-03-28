'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { PDPContent } from './PDPContent';
import { ShoppingBag } from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <Suspense
      fallback={
        <main className="app-container min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-gray-500 animate-pulse">
            <ShoppingBag size={48} />
            <p className="font-medium tracking-wide">Loading Product Details...</p>
          </div>
        </main>
      }
    >
      <PDPContent productId={id} />
    </Suspense>
  );
}
