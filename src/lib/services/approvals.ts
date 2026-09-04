import { prisma } from "@/lib/db";
import { approvalExpiry, hashToken, signApprovalToken } from "@/lib/approval-token";
import { writeAudit } from "@/lib/audit";
import { enqueueExecution } from "@/lib/queue";

export async function createApprovalForExecution(executionId: string) {
  const execution = await prisma.execution.findUnique({
    where: { id: executionId },
    include: { user: true, nodes: true, workflow: true },
  });
  if (!execution) return null;

  const approvalNode = execution.nodes.find((node) => node.type === "approval");
  const writeNode = execution.nodes.find((node) => node.stepId === "write" || node.type === "llm");
  const riskNode = execution.nodes.find((node) => node.type === "risk_check");
  const context = JSON.parse(execution.context) as {
    write?: unknown;
    risk?: { level?: string; reason?: string };
  };
  const content =
    typeof context.write === "string"
      ? context.write
      : String(writeNode ? JSON.parse(writeNode.output || '""') : "");
  const risk = (context.risk ??
    (riskNode ? JSON.parse(riskNode.output || "{}") : { level: "HIGH", reason: "Approval required." })) as {
    level?: string;
    reason?: string;
  };

  const expiresAt = approvalExpiry();
  const approval = await prisma.approval.create({
    data: {
      executionId,
      userId: execution.userId,
      nodeId: approvalNode?.stepId ?? "approval",
      tokenHash: "pending",
      status: "pending",
      riskLevel: risk.level ?? "HIGH",
      riskReason: risk.reason ?? "Approval required.",
      content,
      expiresAt: new Date(expiresAt),
    },
  });

  const token = signApprovalToken({
    approvalId: approval.id,
    executionId,
    expiresAt,
  });
  await prisma.approval.update({
    where: { id: approval.id },
    data: { tokenHash: hashToken(token) },
  });

  return { ...approval, token };
}

export async function sendApprovalEmail(approvalId: string) {
  const approval = await prisma.approval.findUnique({
    where: { id: approvalId },
    include: { user: true },
  });
  if (!approval) return;
  const token = signApprovalToken({
    approvalId: approval.id,
    executionId: approval.executionId,
    expiresAt: approval.expiresAt.getTime(),
  });
  const url = `${process.env.APP_URL ?? "http://localhost:3000"}/approve/${token}`;
  const text = `Postara

Your LinkedIn post is waiting for approval.

────────────────────────

${approval.content}

────────────────────────

Risk: ${approval.riskLevel}
Reason: ${approval.riskReason}

Approve & Publish: ${url}
`;

  if (process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Postara <noreply@localhost>",
        to: approval.user.email,
        subject: "Your LinkedIn post is waiting for approval",
        text,
      }),
    });
  } else {
    console.info("[postara.approval-email]", approval.user.email, url);
  }
  return url;
}

export async function decideApproval(input: {
  approvalId: string;
  decision: "approved" | "rejected" | "edited";
  editedContent?: string;
  actorId?: string;
}) {
  const approval = await prisma.approval.findUniqueOrThrow({
    where: { id: input.approvalId },
    include: { execution: true },
  });
  if (approval.status !== "pending") {
    throw new Error("Approval already decided");
  }
  if (approval.expiresAt.getTime() < Date.now()) {
    throw new Error("Approval expired");
  }

  const content =
    input.decision === "edited" ? (input.editedContent ?? approval.content) : approval.content;

  await prisma.approval.update({
    where: { id: approval.id },
    data: {
      status: input.decision,
      editedContent: input.decision === "edited" ? content : null,
      decidedAt: new Date(),
    },
  });

  const context = JSON.parse(approval.execution.context) as Record<string, unknown>;
  if (input.decision === "rejected") {
    await prisma.execution.update({
      where: { id: approval.executionId },
      data: { status: "CANCELLED", finishedAt: new Date(), error: "Rejected by reviewer" },
    });
    await writeAudit({
      userId: input.actorId ?? approval.userId,
      action: "approval.rejected",
      target: approval.id,
    });
    return { status: "rejected" };
  }

  context.write = content;
  context.steps = { ...(context.steps as Record<string, unknown>), write: content };
  await prisma.execution.update({
    where: { id: approval.executionId },
    data: { context: JSON.stringify(context), status: "PENDING" },
  });
  await prisma.executionNode.updateMany({
    where: { executionId: approval.executionId, type: "approval" },
    data: { status: "SUCCESS", output: JSON.stringify({ decision: input.decision, content }) },
  });
  await writeAudit({
    userId: input.actorId ?? approval.userId,
    action: `approval.${input.decision}`,
    target: approval.id,
  });
  await enqueueExecution({
    executionId: approval.executionId,
    resumeFrom: approval.nodeId,
  });
  return { status: input.decision };
}
