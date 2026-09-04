import { prisma } from "./db";
import { nextCronDate } from "./cron";
import { enqueueExecution } from "./queue";

export async function tickDueWorkflows() {
  const due = await prisma.workflow.findMany({
    where: {
      status: "active",
      nextRunAt: { lte: new Date() },
    },
    take: 25,
  });

  const started: string[] = [];
  for (const workflow of due) {
    const definition = JSON.parse(workflow.definition) as { trigger?: { cron?: string } };
    const execution = await prisma.execution.create({
      data: {
        publicId: `execution_${Math.floor(10_000 + Math.random() * 90_000)}`,
        workflowId: workflow.id,
        userId: workflow.userId,
        status: "PENDING",
        trigger: "schedule",
        context: JSON.stringify({
          user: { id: workflow.userId, name: "", email: "" },
          date: new Date().toISOString(),
          steps: {},
        }),
      },
    });
    await prisma.workflow.update({
      where: { id: workflow.id },
      data: {
        lastRunAt: new Date(),
        nextRunAt: definition.trigger?.cron ? nextCronDate(definition.trigger.cron) : null,
      },
    });
    await enqueueExecution({ executionId: execution.id });
    started.push(execution.publicId);
  }
  return started;
}
