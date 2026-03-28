'use client';

import { ShoppingCart, Star } from 'lucide-react';
import { type Product } from '@/lib/catalog/NykaaCatalogClient';
import Link from 'next/link';
interface ProductCardProps {
  product: Product;
  position: number;
  onClick?: () => void;
  userId?: string;
}

export function ProductCard({ product, position, onClick, userId = 'user-001' }: ProductCardProps) {
  return (
    <Link
      href={`/product/${product.id}?user=${userId}`}
      className="product-card"
      onClick={onClick}
      data-product-id={product.id}
      data-position={position}
    >
      <div className="product-image-container">
        <div className="product-image-placeholder">
          <ShoppingCart size={24} />
        </div>
      </div>
      <div className="product-info">
        <span className="product-brand">{product.brandName}</span>
        <h3 className="product-name">{product.name}</h3>
        <div className="product-meta">
          <span className="product-price">₹{product.price.toLocaleString('en-IN')}</span>
          <span className="product-rating">
            <Star size={12} fill="currentColor" /> {product.rating}
          </span>
        </div>
      </div>
    </Link>
  );
}
