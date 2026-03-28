import { type UserAffinityProfile, type SessionEvent } from '@/lib/db';
import { type Product } from '@/lib/catalog/NykaaCatalogClient';

/**
 * Scores a product using:
 *   score = 0.6 × affinity_match + 0.4 × intent_match
 *
 * Used by both PersonalisationService (shelf) and RerankEngine (search).
 * Extracted to prevent scoring logic drift between the two paths.
 */
export function scoreProduct(
  product: Product,
  affinity: UserAffinityProfile | null,
  recentClicks: SessionEvent[]
): number {
  let affinityScore = 0;
  let intentScore = 0;

  if (affinity) {
    const brandMatch = affinity.top_brands.includes(product.brandId) ? 1 : 0;
    const categoryMatch = affinity.top_categories.includes(product.categoryId) ? 1 : 0;
    affinityScore = (brandMatch + categoryMatch) / 2;
  }

  if (recentClicks.length > 0) {
    const clickedBrands = new Set(recentClicks.map((e) => e.brand_id).filter(Boolean));
    const clickedCategories = new Set(recentClicks.map((e) => e.category_id).filter(Boolean));
    const brandIntent = clickedBrands.has(product.brandId) ? 1 : 0;
    const categoryIntent = clickedCategories.has(product.categoryId) ? 1 : 0;
    intentScore = (brandIntent + categoryIntent) / 2;
  }

  return 0.6 * affinityScore + 0.4 * intentScore;
}
