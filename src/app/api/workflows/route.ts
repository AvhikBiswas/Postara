import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireSession, sameOrigin } from "@/lib/api";
import { saveWorkflow, serializeWorkflow } from "@/lib/services/workflows";

export async function GET(request: Request) {
  try {
    const user = await requireSession(request);
    const workflows = await prisma.workflow.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(workflows.map(serializeWorkflow));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: "CSRF" }, { status: 403 });
    const user = await requireSession(request);
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      definition?: unknown;
      status?: string;
      kind?: string;
    };
    const workflow = await saveWorkflow({
      userId: user.id,
      name: body.name || "Untitled workflow",
      description: body.description,
      definition: body.definition,
      status: body.status,
      kind: body.kind,
    });
    return NextResponse.json(serializeWorkflow(workflow));
  } catch (error) {
    return jsonError(error);
  }
}
