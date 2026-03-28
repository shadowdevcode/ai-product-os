import { getAffinityProfile, getRecentSessionEvents } from '@/lib/db';
import { MOCK_PRODUCTS, type Product } from '@/lib/catalog/NykaaCatalogClient';
import { scoreProduct } from '@/lib/personalisation/score-product';

/**
 * Computes a personalised shelf of products for a user based on:
 *   0.6 × historical affinity (brand/category match)
 *   0.4 × in-session intent (recent clicks)
 */
export async function getShelfProducts(userId: string, maxProducts = 12): Promise<Product[]> {
  const [affinity, recentClicks] = await Promise.all([
    getAffinityProfile(userId),
    getRecentSessionEvents(userId, 3),
  ]);

  const scored = MOCK_PRODUCTS.map((product) => ({
    product,
    score: scoreProduct(product, affinity, recentClicks),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, maxProducts).map((s) => s.product);
}
