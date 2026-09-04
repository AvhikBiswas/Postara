import { NextResponse } from "next/server";
import { jsonError, requireSession, sameOrigin } from "@/lib/api";
import { connectDemoLinkedIn } from "@/lib/services/linkedin";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: "CSRF" }, { status: 403 });
    const user = await requireSession(request);
    await connectDemoLinkedIn(user.id, user.name ?? "LinkedIn");
    return NextResponse.json({ ok: true, demo: true });
  } catch (error) {
    return jsonError(error);
  }
}
