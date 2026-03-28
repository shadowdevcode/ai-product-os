import { getAffinityProfile, getRecentSessionEvents } from '@/lib/db';
import { type Product } from '@/lib/catalog/NykaaCatalogClient';
import { scoreProduct } from '@/lib/personalisation/score-product';

/**
 * Re-ranks a candidate set of products using:
 *   score = 0.6 × affinity_match + 0.4 × intent_match
 * Returns top 20 sorted by score descending.
 */
export async function rerankProducts(userId: string, candidates: Product[]): Promise<Product[]> {
  const [affinity, recentClicks] = await Promise.all([
    getAffinityProfile(userId),
    getRecentSessionEvents(userId, 3),
  ]);

  const scored = candidates.map((product) => ({
    product,
    score: scoreProduct(product, affinity, recentClicks),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 20).map((s) => s.product);
}
