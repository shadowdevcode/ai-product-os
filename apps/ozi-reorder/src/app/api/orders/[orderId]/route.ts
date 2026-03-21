import { NextRequest, NextResponse } from "next/server";
import { getOrderByOrderId, getReminderForOrder } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
): Promise<NextResponse> {
  const { orderId } = await params;

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const order = await getOrderByOrderId(orderId);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
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
