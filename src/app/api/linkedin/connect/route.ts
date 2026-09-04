import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { jsonError, requireSession } from "@/lib/api";
import { connectDemoLinkedIn, linkedinAuthorizeUrl, linkedinConfigured } from "@/lib/services/linkedin";

export async function GET(request: Request) {
  try {
    const user = await requireSession(request);
    if (!linkedinConfigured()) {
      await connectDemoLinkedIn(user.id, user.name ?? "LinkedIn");
      return NextResponse.redirect(new URL("/autopilot?linkedin=demo", request.url));
    }
    const state = randomBytes(16).toString("hex");
    const response = NextResponse.redirect(linkedinAuthorizeUrl(state));
    response.cookies.set("linkedin_oauth_state", `${state}:${user.id}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    });
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
