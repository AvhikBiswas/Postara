import { NextResponse } from "next/server";
import { jsonError, requireSession, sameOrigin } from "@/lib/api";
import { generateWorkflowFromPrompt } from "@/lib/ai-builder";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: "CSRF" }, { status: 403 });
    const user = await requireSession(request);
    const body = (await request.json()) as { prompt?: string };
    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "Describe the workflow you want" }, { status: 400 });
    }
    const definition = await generateWorkflowFromPrompt(body.prompt);
    return NextResponse.json({
      name: inferName(body.prompt),
      definition,
      userId: user.id,
    });
  } catch (error) {
    return jsonError(error);
  }
}

function inferName(prompt: string) {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  return cleaned.length > 48 ? `${cleaned.slice(0, 47)}…` : cleaned || "Generated workflow";
}
