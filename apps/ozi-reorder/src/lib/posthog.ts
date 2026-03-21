import { PostHog } from "posthog-node";

function getClient(): PostHog {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";
  if (!key) throw new Error("NEXT_PUBLIC_POSTHOG_KEY is not set");
  return new PostHog(key, { host });
}

async function capture(
  distinctId: string,
  event: string,
  properties: Record<string, unknown>
): Promise<void> {
  const client = getClient();
  client.capture({ distinctId, event, properties });
  await client.flush();
}

// ─── Event 1: reminder_triggered ─────────────────────────────────────────────
export async function trackReminderTriggered(props: {
  userId: string;
  orderId: string;
  skuCategory: string;
  triggerDay: number;
}): Promise<void> {
  await capture(props.userId, "reminder_triggered", {
    user_id: props.userId,
    order_id: props.orderId,
    sku_category: props.skuCategory,
    trigger_day: props.triggerDay,
    group: "test",
  });
}

// ─── Event 2: reminder_delivered ─────────────────────────────────────────────
export async function trackReminderDelivered(props: {
  userId: string;
  reminderId: string;
}): Promise<void> {
  await capture(props.userId, "reminder_delivered", {
    user_id: props.userId,
    reminder_id: props.reminderId,
  });
}

// ─── Event 6: order_placed (server path) ─────────────────────────────────────
export async function trackOrderPlaced(props: {
  userId: string;
  source: "reminder" | "organic";
  newOrderId: string;
}): Promise<void> {
  await capture(props.userId, "order_placed", {
    user_id: props.userId,
    source: props.source,
    new_order_id: props.newOrderId,
  });
}

// ─── Event 7: control_order_placed ───────────────────────────────────────────
export async function trackControlOrderPlaced(props: {
  userId: string;
  newOrderId: string;
}): Promise<void> {
  await capture(props.userId, "control_order_placed", {
    user_id: props.userId,
    source: "organic",
    new_order_id: props.newOrderId,
  });
}
