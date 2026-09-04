import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { hashToken, verifyApprovalToken } from "@/lib/approval-token";
import { decideApproval } from "@/lib/services/approvals";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const payload = verifyApprovalToken(token);
    const approval = await prisma.approval.findUnique({
      where: { id: payload.approvalId },
      include: { execution: { select: { publicId: true } } },
    });
    if (!approval || approval.tokenHash !== hashToken(token)) {
      return NextResponse.json({ error: "Invalid approval token" }, { status: 404 });
    }
    return NextResponse.json({
      id: approval.id,
      status: approval.status,
      riskLevel: approval.riskLevel,
      riskReason: approval.riskReason,
      content: approval.content,
      expiresAt: approval.expiresAt,
      executionPublicId: approval.execution.publicId,
    });
  } catch (error) {
    return jsonError(error, 400);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const payload = verifyApprovalToken(token);
    const approval = await prisma.approval.findUnique({ where: { id: payload.approvalId } });
    if (!approval || approval.tokenHash !== hashToken(token)) {
      return NextResponse.json({ error: "Invalid approval token" }, { status: 404 });
    }
    const body = (await request.json()) as {
      decision?: "approved" | "rejected" | "edited";
      content?: string;
    };
    const result = await decideApproval({
      approvalId: approval.id,
      decision: body.decision ?? "approved",
      editedContent: body.content,
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error, 400);
  }
}
