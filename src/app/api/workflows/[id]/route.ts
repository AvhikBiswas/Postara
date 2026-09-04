import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireSession, sameOrigin } from "@/lib/api";
import { assertWorkflowAccess } from "@/lib/permissions";
import { saveWorkflow, serializeWorkflow } from "@/lib/services/workflows";
import { writeAudit } from "@/lib/audit";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession(request);
    const { id } = await params;
    const workflow = await assertWorkflowAccess(user.id, id, user.role);
    return NextResponse.json(serializeWorkflow(workflow));
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: "CSRF" }, { status: 403 });
    const user = await requireSession(request);
    const { id } = await params;
    await assertWorkflowAccess(user.id, id, user.role);
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      definition?: unknown;
      status?: string;
      kind?: string;
    };
    const existing = await prisma.workflow.findUniqueOrThrow({ where: { id } });
    const workflow = await saveWorkflow({
      id,
      userId: user.id,
      name: body.name ?? existing.name,
      description: body.description ?? existing.description,
      definition: body.definition ?? JSON.parse(existing.definition),
      status: body.status ?? existing.status,
      kind: body.kind ?? existing.kind,
    });
    return NextResponse.json(serializeWorkflow(workflow));
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: "CSRF" }, { status: 403 });
    const user = await requireSession(request);
    const { id } = await params;
    await assertWorkflowAccess(user.id, id, user.role);
    await prisma.workflow.delete({ where: { id } });
    await writeAudit({ userId: user.id, action: "workflow.deleted", target: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
