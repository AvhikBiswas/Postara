import { NextResponse } from "next/server";
import { auth } from "./auth";
import { rateLimit } from "./rate-limit";

export async function jsonError(error: unknown, fallback = 500) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const status =
    message === "UNAUTHENTICATED"
      ? 401
      : message === "FORBIDDEN" || message.includes("FORBIDDEN")
        ? 403
        : message.includes("expired") || message.includes("Invalid")
          ? 400
          : fallback;
  return NextResponse.json({ error: message }, { status });
}

export async function requireSession(request?: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHENTICATED");
  }
  if (request) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const limited = rateLimit(`api:${session.user.id}:${ip}`, 120, 60_000);
    if (!limited.ok) {
      throw new Error("RATE_LIMITED");
    }
  }
  return session.user;
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const app = process.env.APP_URL ?? "http://localhost:3000";
  return origin === app || origin.startsWith("http://localhost:");
}
