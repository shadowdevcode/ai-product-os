import { NextRequest, NextResponse } from "next/server";
import { markPitchCopied } from "@/lib/db";

// Validates UUID v4 format
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid session ID format" }, { status: 400 });
  }

  let found: boolean;
  try {
    found = await markPitchCopied(id);
  } catch (err) {
    console.error("markPitchCopied DB error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (!found) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
