import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireSession, sameOrigin } from "@/lib/api";
import { createCheckoutSession } from "@/lib/services/billing";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: "CSRF" }, { status: 403 });
    const sessionUser = await requireSession(request);
    const body = (await request.json()) as { plan?: "pro" | "team" };
    const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id } });
    const url = await createCheckoutSession(user, body.plan ?? "pro");
    return NextResponse.json({ url });
  } catch (error) {
    return jsonError(error);
  }
}
