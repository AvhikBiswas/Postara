import { NextResponse } from "next/server";
import { tickDueWorkflows } from "@/lib/scheduler";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const started = await tickDueWorkflows();
  return NextResponse.json({ ok: true, started });
}
