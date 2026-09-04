import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = [
  "/dashboard",
  "/autopilot",
  "/automation",
  "/workflows",
  "/executions",
  "/approvals",
  "/settings",
  "/admin",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (!isProtected) return NextResponse.next();

  const session =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");
  if (!session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/dashboard",
    "/autopilot/:path*",
    "/autopilot",
    "/automation/:path*",
    "/automation",
    "/workflows/:path*",
    "/workflows",
    "/executions/:path*",
    "/executions",
    "/approvals/:path*",
    "/approvals",
    "/settings/:path*",
    "/settings",
    "/admin/:path*",
    "/admin",
  ],
};
