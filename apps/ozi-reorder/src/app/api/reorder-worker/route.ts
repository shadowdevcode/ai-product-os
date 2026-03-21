import { NextRequest, NextResponse } from "next/server";
import { upsertCohort, insertReminder, markReminderSent } from "@/lib/db";
import {
  trackReminderTriggered,
  trackReminderDelivered,
} from "@/lib/posthog";
import { assignCohort } from "@/lib/cohort";

interface WorkerBody {
  userId: string;
  orderId: string;
  skuCategory: string;
  triggerDay: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: WorkerBody;
  try {
    body = (await request.json()) as WorkerBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, orderId, skuCategory, triggerDay } = body;

  if (!userId || !orderId || !skuCategory || triggerDay === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Assign cohort deterministically (write-once via ON CONFLICT DO UPDATE)
  const group = assignCohort(userId);
  await upsertCohort(userId, group);

  if (group === "control") {
    return NextResponse.json({ group: "control", skipped: true });
  }

  // Test group: pre-generate reminderId before any DB/telemetry op
  const reminderId = crypto.randomUUID();

  // markReminderSent first: if this fails, the order stays eligible and we retry next run
  // (no reminder row yet, no duplicate). If insertReminder fails after, the order is
  // marked sent (analytics gap) but the user receives no duplicate notification.
  await markReminderSent(orderId);
  await insertReminder({ id: reminderId, userId, orderId, skuCategory, triggerDay });

  try {
    await Promise.all([
      trackReminderTriggered({ userId, orderId, skuCategory, triggerDay }),
      trackReminderDelivered({ userId, reminderId }),
    ]);
  } catch (err) {
    // DB writes already succeeded — log analytics gap but don't fail the worker
    console.error("[reorder-worker] PostHog tracking failed:", err);
  }

  return NextResponse.json({ group: "test", reminderId });
}
