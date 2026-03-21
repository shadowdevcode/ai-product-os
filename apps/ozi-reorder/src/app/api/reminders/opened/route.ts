import { NextRequest, NextResponse } from "next/server";
import { markReminderOpened } from "@/lib/db";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { reminderId: string };
  try {
    body = (await request.json()) as { reminderId: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.reminderId) {
    return NextResponse.json({ error: "reminderId is required" }, { status: 400 });
  }

  try {
    await markReminderOpened(body.reminderId);
  } catch (err) {
    // Fire-and-forget call site — log but don't surface DB errors to client
    console.error("[reminders/opened] markReminderOpened failed:", err);
  }
  return NextResponse.json({ ok: true });
}
