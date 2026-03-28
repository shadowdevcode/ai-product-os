/**
 * Mock Nykaa Catalog API client.
 * In production this would call Nykaa's real catalog API with NYKAA_CATALOG_API_KEY.
 * For MVP we use a static product catalog.
 */

export interface Product {
  id: string;
  name: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  price: number;
  imageUrl: string;
  rating: number;
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p-001',
    name: 'Floral Wrap Dress',
    brandId: 'brand-zara',
    brandName: 'Zara',
    categoryId: 'cat-dresses',
    categoryName: 'Dresses',
    price: 3990,
    imageUrl: '/products/floral-dress.jpg',
    rating: 4.5,
  },
  {
    id: 'p-002',
    name: 'Slim Fit Blazer',
    brandId: 'brand-zara',
    brandName: 'Zara',
    categoryId: 'cat-blazers',
    categoryName: 'Blazers',
    price: 5990,
    imageUrl: '/products/blazer.jpg',
    rating: 4.3,
  },
  {
    id: 'p-003',
    name: 'Cotton Crew Neck Tee',
    brandId: 'brand-hm',
    brandName: 'H&M',
    categoryId: 'cat-tops',
    categoryName: 'Tops',
    price: 999,
    imageUrl: '/products/crew-tee.jpg',
    rating: 4.1,
  },
  {
    id: 'p-004',
    name: 'Pleated Midi Skirt',
    brandId: 'brand-mango',
    brandName: 'Mango',
    categoryId: 'cat-dresses',
    categoryName: 'Dresses',
    price: 2990,
    imageUrl: '/products/midi-skirt.jpg',
    rating: 4.4,
  },
  {
    id: 'p-005',
    name: 'Air Max Running Shoes',
    brandId: 'brand-nike',
    brandName: 'Nike',
    categoryId: 'cat-sneakers',
    categoryName: 'Sneakers',
    price: 8995,
    imageUrl: '/products/air-max.jpg',
    rating: 4.7,
  },
  {
    id: 'p-006',
    name: 'Ultraboost 22',
    brandId: 'brand-adidas',
    brandName: 'Adidas',
    categoryId: 'cat-sneakers',
    categoryName: 'Sneakers',
    price: 9999,
    imageUrl: '/products/ultraboost.jpg',
    rating: 4.6,
  },
  {
    id: 'p-007',
    name: 'Yoga Leggings',
    brandId: 'brand-nike',
    brandName: 'Nike',
    categoryId: 'cat-activewear',
    categoryName: 'Activewear',
    price: 3295,
    imageUrl: '/products/yoga-leggings.jpg',
    rating: 4.5,
  },
  {
    id: 'p-008',
    name: 'Track Jacket',
    brandId: 'brand-adidas',
    brandName: 'Adidas',
    categoryId: 'cat-activewear',
    categoryName: 'Activewear',
    price: 4499,
    imageUrl: '/products/track-jacket.jpg',
    rating: 4.2,
  },
  {
    id: 'p-009',
    name: 'Cushion Matte Lip Crayon',
    brandId: 'brand-lakme',
    brandName: 'Lakme',
    categoryId: 'cat-makeup',
    categoryName: 'Makeup',
    price: 699,
    imageUrl: '/products/lip-crayon.jpg',
    rating: 4.4,
  },
  {
    id: 'p-010',
    name: 'Fit Me Foundation',
    brandId: 'brand-maybelline',
    brandName: 'Maybelline',
    categoryId: 'cat-makeup',
    categoryName: 'Makeup',
    price: 549,
    imageUrl: '/products/foundation.jpg',
    rating: 4.3,
  },
  {
    id: 'p-011',
    name: 'Vitamin C Serum',
    brandId: 'brand-lakme',
    brandName: 'Lakme',
    categoryId: 'cat-skincare',
    categoryName: 'Skincare',
    price: 899,
    imageUrl: '/products/vitamin-c.jpg',
    rating: 4.6,
  },
  {
    id: 'p-012',
    name: '512 Slim Taper Jeans',
    brandId: 'brand-levis',
    brandName: "Levi's",
    categoryId: 'cat-jeans',
    categoryName: 'Jeans',
    price: 3999,
    imageUrl: '/products/512-jeans.jpg',
    rating: 4.5,
  },
  {
    id: 'p-013',
    name: 'Classic Straight Jeans',
    brandId: 'brand-wrangler',
    brandName: 'Wrangler',
    categoryId: 'cat-jeans',
    categoryName: 'Jeans',
    price: 2499,
    imageUrl: '/products/wrangler-jeans.jpg',
    rating: 4.2,
  },
  {
    id: 'p-014',
    name: 'Tie-Front Blouse',
    brandId: 'brand-forever21',
    brandName: 'Forever 21',
    categoryId: 'cat-tops',
    categoryName: 'Tops',
    price: 1299,
    imageUrl: '/products/tie-blouse.jpg',
    rating: 4.0,
  },
  {
    id: 'p-015',
    name: 'Linen Shirt Dress',
    brandId: 'brand-hm',
    brandName: 'H&M',
    categoryId: 'cat-dresses',
    categoryName: 'Dresses',
    price: 1999,
    imageUrl: '/products/linen-dress.jpg',
    rating: 4.3,
  },
  {
    id: 'p-016',
    name: 'Ribbed Tank Top',
    brandId: 'brand-zara',
    brandName: 'Zara',
    categoryId: 'cat-tops',
    categoryName: 'Tops',
    price: 1290,
    imageUrl: '/products/ribbed-tank.jpg',
    rating: 4.1,
  },
  {
    id: 'p-017',
    name: 'Satin Slip Dress',
    brandId: 'brand-mango',
    brandName: 'Mango',
    categoryId: 'cat-dresses',
    categoryName: 'Dresses',
    price: 4490,
    imageUrl: '/products/satin-dress.jpg',
    rating: 4.5,
  },
  {
    id: 'p-018',
    name: 'Sport Bra',
    brandId: 'brand-nike',
    brandName: 'Nike',
    categoryId: 'cat-activewear',
    categoryName: 'Activewear',
    price: 2295,
    imageUrl: '/products/sport-bra.jpg',
    rating: 4.4,
  },
  {
    id: 'p-019',
    name: 'Kohl Kajal',
    brandId: 'brand-lakme',
    brandName: 'Lakme',
    categoryId: 'cat-makeup',
    categoryName: 'Makeup',
    price: 299,
    imageUrl: '/products/kajal.jpg',
    rating: 4.7,
  },
  {
    id: 'p-020',
    name: 'Bootcut Denim',
    brandId: 'brand-levis',
    brandName: "Levi's",
    categoryId: 'cat-jeans',
    categoryName: 'Jeans',
    price: 4299,
    imageUrl: '/products/bootcut.jpg',
    rating: 4.3,
  },
];

export const EDITORIAL_PRODUCTS: Product[] = MOCK_PRODUCTS.slice(0, 8);

/**
 * Search products by query string (mock implementation).
 * Simulates calling Nykaa Catalog API with a wrapped Promise.race and AbortController at 8s.
 */
export async function searchProducts(query: string): Promise<Product[]> {
  const q = query.toLowerCase();

  const searchPromise = new Promise<Product[]>((resolve) => {
    const results = MOCK_PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brandName.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q)
    );
    // Simulate network delay
    setTimeout(() => {
      resolve(results.length > 0 ? results : MOCK_PRODUCTS.slice(0, 12));
    }, 100);
  });

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 8000);

  const timeoutPromise = new Promise<Product[]>((_, reject) => {
    abortController.signal.addEventListener('abort', () => {
      reject(new Error('Nykaa Catalog API timeout exceeded 8s'));
    });
  });

  try {
    return await Promise.race([searchPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}
