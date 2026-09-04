import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireSession } from "@/lib/api";
import { assertExecutionAccess } from "@/lib/permissions";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession(request);
    const { id } = await params;
    const found = await assertExecutionAccess(user.id, id, user.role);
    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const execution = await prisma.execution.findUniqueOrThrow({
      where: { id: found.id },
      include: {
        workflow: true,
        nodes: { orderBy: { sortOrder: "asc" } },
        events: { orderBy: { createdAt: "asc" } },
        approvals: true,
        posts: true,
      },
    });
    return NextResponse.json({
      ...execution,
      context: JSON.parse(execution.context),
      workflow: {
        ...execution.workflow,
        definition: JSON.parse(execution.workflow.definition),
      },
      nodes: execution.nodes.map((node) => ({
        ...node,
        input: JSON.parse(node.input || "{}"),
        output: JSON.parse(node.output || "{}"),
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
