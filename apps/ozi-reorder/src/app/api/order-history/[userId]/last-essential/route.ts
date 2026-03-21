import { NextRequest, NextResponse } from "next/server";
import { getLastEssentialOrder, getReminderForOrder } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse> {
  const { userId } = await params;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const order = await getLastEssentialOrder(userId);

  if (!order) {
    return NextResponse.json(
      { error: "No essential order found for this user" },
      { status: 404 }
    );
  }

  const reminder = await getReminderForOrder(order.order_id);

  return NextResponse.json({
    orderId: order.order_id,
    productName: order.product_name,
    brand: order.brand,
    quantity: order.quantity,
    priceInr: order.price_inr,
    skuCategory: order.sku_category,
    imageUrl: order.image_url,
    deliveredAt: order.delivered_at,
    reminderId: reminder?.id ?? null,
  });
}
