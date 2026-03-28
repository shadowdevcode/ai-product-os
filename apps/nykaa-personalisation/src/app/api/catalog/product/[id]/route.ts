import { NextRequest, NextResponse } from 'next/server';
import { getProductById } from '@/lib/catalog/NykaaCatalogClient';

/**
 * GET /api/catalog/product/[id]
 * Fetches product details for the PDP.
 * This is the 'Backend Agent' logic that provides a robust API for product data.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const product = await getProductById(id);

    if (!product) {
      return NextResponse.json({ error: 'Product not found', id }, { status: 404 });
    }

    // In a real app, you might add cache-control headers here
    return NextResponse.json(product, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('[API_PRODUCT_FETCH_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
