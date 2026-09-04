import { prisma } from "./db";

export async function assertWorkflowAccess(userId: string, workflowId: string, role?: string) {
  if (role === "ADMIN") return prisma.workflow.findUniqueOrThrow({ where: { id: workflowId } });
  const workflow = await prisma.workflow.findFirst({ where: { id: workflowId, userId } });
  if (!workflow) {
    throw new Error("WORKFLOW_FORBIDDEN");
  }
  return workflow;
}

export async function assertExecutionAccess(userId: string, executionId: string, role?: string) {
  if (role === "ADMIN") {
    return prisma.execution.findFirst({
      where: { OR: [{ id: executionId }, { publicId: executionId }] },
    });
  }
  const execution = await prisma.execution.findFirst({
    where: {
      userId,
      OR: [{ id: executionId }, { publicId: executionId }],
    },
  });
  if (!execution) {
    throw new Error("EXECUTION_FORBIDDEN");
  }
  return execution;
}
