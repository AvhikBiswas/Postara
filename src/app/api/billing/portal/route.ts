import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireSession, sameOrigin } from "@/lib/api";
import { createPortalSession } from "@/lib/services/billing";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: "CSRF" }, { status: 403 });
    const sessionUser = await requireSession(request);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id } });
    if (!user.stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer" }, { status: 400 });
    }
    const url = await createPortalSession(user.stripeCustomerId);
    return NextResponse.json({ url });
  } catch (error) {
    return jsonError(error);
  }
}
