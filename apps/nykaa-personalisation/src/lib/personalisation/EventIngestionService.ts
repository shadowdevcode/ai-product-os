import { insertSessionEvent } from '@/lib/db';

export async function ingestSessionEvent(params: {
  userId: string;
  sessionId: string;
  productId: string;
  brandId?: string | null;
  categoryId?: string | null;
  eventType?: string;
}): Promise<void> {
  await insertSessionEvent({
    userId: params.userId,
    sessionId: params.sessionId,
    productId: params.productId,
    brandId: params.brandId ?? null,
    categoryId: params.categoryId ?? null,
    eventType: params.eventType,
  });
}
