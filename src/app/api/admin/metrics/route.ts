import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { getAdminMetrics } from "@/lib/services/admin";

export async function GET(request: Request) {
  try {
    const user = await requireSession(request);
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    return NextResponse.json(await getAdminMetrics());
  } catch (error) {
    return jsonError(error);
  }
}
