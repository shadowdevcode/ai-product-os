import { NextResponse } from "next/server";
import { truncateMockOrders, insertMockOrders } from "@/lib/db";
import { SEED_ORDERS } from "@/lib/seed-data";

export async function POST(): Promise<NextResponse> {
  try {
    await truncateMockOrders();
    const count = await insertMockOrders(SEED_ORDERS);
    return NextResponse.json({ inserted: count });
  } catch (error) {
    console.error("[seed] failed:", error);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
