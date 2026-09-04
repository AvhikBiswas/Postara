import { prisma } from "./db";

export async function writeAudit(input: {
  userId?: string | null;
  action: string;
  target?: string;
  metadata?: unknown;
  ip?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      target: input.target,
      metadata: JSON.stringify(input.metadata ?? {}),
      ip: input.ip ?? null,
    },
  });
}
