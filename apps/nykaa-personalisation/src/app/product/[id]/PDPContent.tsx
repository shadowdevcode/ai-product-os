'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getProductById, type Product } from '@/lib/catalog/NykaaCatalogClient';
import { useIntentTracker } from '@/components/personalisation/useIntentTracker';
import { ForYouShelf } from '@/components/personalisation/ForYouShelf';
import { ArrowLeft, Star, ShoppingBag, Heart, Share2, ShieldCheck, Truck } from 'lucide-react';
import Link from 'next/link';

interface PDPContentProps {
  productId: string;
}

export function PDPContent({ productId }: PDPContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('user') ?? 'user-001';
  const authToken = btoa(JSON.stringify({ userId }));

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [added, setAdded] = useState(false);

  const { trackAddToCart } = useIntentTracker(authToken);

  useEffect(() => {
    async function loadProduct() {
      try {
        const response = await fetch(`/api/catalog/product/${productId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch product');
        }
        const p = await response.json();
        setProduct(p);

        // Track page view for the product
        if (typeof window !== 'undefined' && window.posthog) {
          window.posthog.capture('pdp_viewed', {
            productId,
            userId,
            productName: p?.name,
            category: p?.categoryName,
          });
        }
      } catch (err) {
        console.error('[PDP_LOAD_ERROR]', err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [productId, userId]);

  const handleAddToCart = useCallback(() => {
    if (!product) return;

    setAddingToCart(true);

    // Track the conversion event
    trackAddToCart(product);

    // Simulate API call
    setTimeout(() => {
      setAddingToCart(false);
      setAdded(true);
      setTimeout(() => setAdded(false), 3000);
    }, 800);
  }, [product, trackAddToCart]);

  if (loading) {
    return (
      <div className="pdp-loading">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-64 h-80 bg-gray-200 rounded-lg mb-4"></div>
          <div className="w-48 h-6 bg-gray-200 rounded mb-2"></div>
          <div className="w-32 h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pdp-error">
        <h2>Product not found</h2>
        <Link href="/" className="btn-primary mt-4">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="pdp-container">
      <header className="pdp-header">
        <button onClick={() => router.back()} className="back-btn">
          <ArrowLeft size={20} />
        </button>
        <div className="header-actions">
          <button className="icon-btn">
            <Share2 size={20} />
          </button>
          <button className="icon-btn">
            <Heart size={20} />
          </button>
        </div>
      </header>

      <div className="pdp-grid">
        <div className="pdp-image-section">
          <div className="main-image-wrapper">
            <div className="product-image-placeholder large">
              <ShoppingBag size={64} className="text-gray-300" />
            </div>
            {/* In a real app, we'd use product.imageUrl */}
            <div className="image-overlay-badge">New Arrival</div>
          </div>
          <div className="thumbnail-strip">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`thumbnail ${i === 1 ? 'active' : ''}`}></div>
            ))}
          </div>
        </div>

        <div className="pdp-info-section">
          <div className="brand-badge">{product.brandName}</div>
          <h1 className="product-title">{product.name}</h1>
          <div className="rating-row">
            <div className="stars">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={14}
                  fill={i <= Math.round(product.rating) ? '#fc2779' : 'none'}
                  stroke={i <= Math.round(product.rating) ? '#fc2779' : '#ccc'}
                />
              ))}
            </div>
            <span className="rating-text">{product.rating} / 5.0 (1.2k Reviews)</span>
          </div>

          <div className="price-row">
            <span className="current-price">₹{product.price.toLocaleString('en-IN')}</span>
            <span className="mrp text-gray-400 line-through ml-2 text-sm">
              ₹{(product.price * 1.25).toFixed(0)}
            </span>
            <span className="discount-tag ml-2 text-green-600 font-bold">25% OFF</span>
          </div>

          <p className="product-description">
            Experience premium comfort and style with this {product.categoryName.toLowerCase()} from{' '}
            {product.brandName}. Perfect for any occasion, crafted with the finest materials to
            ensure durability and a superior aesthetic.
          </p>

          <div className="pdp-actions">
            <button
              className={`add-to-cart-btn ${added ? 'success' : ''}`}
              onClick={handleAddToCart}
              disabled={addingToCart || added}
            >
              {addingToCart ? 'Sending to Bag...' : added ? 'Added to Bag!' : 'Add to Bag'}
            </button>
            <button className="wishlist-btn">
              <Heart size={20} />
            </button>
          </div>

          <div className="pdp-features">
            <div className="feature-item">
              <Truck size={18} />
              <span>Free Delivery on orders above ₹499</span>
            </div>
            <div className="feature-item">
              <ShieldCheck size={18} />
              <span>100% Authentic Products</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations Shelf */}
      <div className="mt-12 pt-8 border-t border-gray-100">
        <div className="px-4 mb-4">
          <h2 className="text-xl font-bold text-gray-900">You Might Also Like</h2>
          <p className="text-xs text-gray-500">Based on your style and browsing</p>
        </div>
        <ForYouShelf
          authToken={authToken}
          userId={userId}
          onProductClick={(p) => {
            // Optional: Log recommendation click if needed
          }}
        />
      </div>

      <section className="pdp-extra-info mt-8">
        <div className="tabs">
          <button className="tab active">Product Details</button>
          <button className="tab">Size Guide</button>
          <button className="tab">Reviews</button>
        </div>
        <div className="tab-content pt-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            This {product.name} is a testament to {product.brandName}&apos;s commitment to
            excellence. Part of our latest {product.categoryName} collection, it combines
            contemporary design with functional utility.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-gray-700">
            <li>• Material: Premium Grade Fabric</li>
            <li>• Fit: Regular Fit</li>
            <li>• Care: Dry Clean Recommended</li>
            <li>• Origin: Crafted in India</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
