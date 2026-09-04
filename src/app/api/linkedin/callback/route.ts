import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeLinkedInCode, saveLinkedInConnection } from "@/lib/services/linkedin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const stored = cookieStore.get("linkedin_oauth_state")?.value;
  if (!code || !state || !stored || !stored.startsWith(`${state}:`)) {
    return NextResponse.redirect(new URL("/settings?linkedin=error", request.url));
  }
  const userId = stored.split(":")[1];
  try {
    const tokens = await exchangeLinkedInCode(code);
    await saveLinkedInConnection(userId, tokens);
    const response = NextResponse.redirect(new URL("/autopilot?linkedin=connected", request.url));
    response.cookies.delete("linkedin_oauth_state");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/settings?linkedin=error", request.url));
  }
}
