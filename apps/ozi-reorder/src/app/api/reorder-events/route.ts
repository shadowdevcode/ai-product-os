import { NextRequest, NextResponse } from "next/server";
import { insertReorderEvent } from "@/lib/db";
import { trackOrderPlaced, trackControlOrderPlaced } from "@/lib/posthog";

type EventType = "checkout_started" | "order_placed" | "control_order_placed";

interface ReorderEventBody {
  eventType: EventType;
  userId: string;
  orderId: string;
  reminderId?: string;
  newOrderId?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Demo-mode auth: prevents trivial metric fabrication during founder pitch.
  // Set DEMO_SECRET env var; callers must send x-demo-key: <value>.
  // Not production auth — scoped to this demo system only.
  const demoSecret = process.env.DEMO_SECRET;
  if (demoSecret && request.headers.get("x-demo-key") !== demoSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ReorderEventBody;
  try {
    body = (await request.json()) as ReorderEventBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { eventType, userId, orderId, reminderId, newOrderId } = body;

  if (!eventType || !userId || !orderId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validTypes: EventType[] = [
    "checkout_started",
    "order_placed",
    "control_order_placed",
  ];
  if (!validTypes.includes(eventType)) {
    return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
  }

  const eventId = crypto.randomUUID();
  const generatedOrderId = newOrderId ?? `ORD-${Date.now()}`;

  const source: "reminder" | "organic" =
    eventType === "control_order_placed" ? "organic" : "reminder";

  // checkout_started is PostHog-only — do not write a DB row (would inflate orders placed count)
  if (eventType !== "checkout_started") {
    await insertReorderEvent({
      id: eventId,
      userId,
      source,
      reminderId: reminderId ?? null,
      originalOrderId: orderId,
      newOrderId: generatedOrderId,
    });
  }

  if (eventType === "order_placed") {
    await trackOrderPlaced({ userId, source: "reminder", newOrderId: generatedOrderId });
  } else if (eventType === "control_order_placed") {
    await trackControlOrderPlaced({ userId, newOrderId: generatedOrderId });
  }

  return NextResponse.json({ eventId, newOrderId: generatedOrderId });
}
