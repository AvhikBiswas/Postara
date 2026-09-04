import { NextResponse } from "next/server";
import { jsonError, requireSession, sameOrigin } from "@/lib/api";
import { assertWorkflowAccess } from "@/lib/permissions";
import { runWorkflow } from "@/lib/services/workflows";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: "CSRF" }, { status: 403 });
    const user = await requireSession(request);
    const { id } = await params;
    await assertWorkflowAccess(user.id, id, user.role);
    const execution = await runWorkflow({
      workflowId: id,
      userId: user.id,
      userName: user.name ?? "Operator",
      userEmail: user.email ?? "",
      trigger: "manual",
    });
    return NextResponse.json(execution);
  } catch (error) {
    return jsonError(error);
  }
}
