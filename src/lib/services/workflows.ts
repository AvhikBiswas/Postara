import { prisma } from "@/lib/db";
import { nextCronDate } from "@/lib/cron";
import { parseWorkflowDefinition } from "@/lib/engine/schema";
import type { ExecutionContext, WorkflowDefinition } from "@/lib/engine/types";
import { enqueueExecution } from "@/lib/queue";
import { writeAudit } from "@/lib/audit";
import { publicExecutionId } from "@/lib/utils";

export async function saveWorkflow(input: {
  userId: string;
  name: string;
  description?: string;
  definition: unknown;
  status?: string;
  kind?: string;
  id?: string;
}) {
  const definition = parseWorkflowDefinition(input.definition);
  const nextRunAt =
    definition.trigger.type === "schedule" && input.status === "active"
      ? nextCronDate(definition.trigger.cron)
      : null;
  const data = {
    name: input.name,
    description: input.description ?? "",
    definition: JSON.stringify(definition),
    status: input.status ?? "draft",
    kind: input.kind ?? "custom",
    nextRunAt,
  };
  if (input.id) {
    const workflow = await prisma.workflow.update({
      where: { id: input.id },
      data,
    });
    await writeAudit({ userId: input.userId, action: "workflow.updated", target: workflow.id });
    return workflow;
  }
  const workflow = await prisma.workflow.create({
    data: { ...data, userId: input.userId },
  });
  await writeAudit({ userId: input.userId, action: "workflow.created", target: workflow.id });
  return workflow;
}

export async function runWorkflow(input: {
  workflowId: string;
  userId: string;
  userName: string;
  userEmail: string;
  trigger?: string;
}) {
  const workflow = await prisma.workflow.findFirstOrThrow({
    where: { id: input.workflowId, userId: input.userId },
  });
  const definition = parseWorkflowDefinition(JSON.parse(workflow.definition));
  const previous = await prisma.post.findFirst({
    where: { userId: input.userId, status: "published" },
    orderBy: { createdAt: "desc" },
  });
  const context: ExecutionContext = {
    user: { id: input.userId, name: input.userName, email: input.userEmail },
    date: new Date().toISOString(),
    previous_post: previous?.content,
    steps: {},
    topic: extractTopics(definition),
    topics: extractTopics(definition),
    instructions: extractInstructions(definition),
  };
  const execution = await prisma.execution.create({
    data: {
      publicId: publicExecutionId(),
      workflowId: workflow.id,
      userId: input.userId,
      status: "PENDING",
      trigger: input.trigger ?? "manual",
      context: JSON.stringify(context),
    },
  });
  await prisma.workflow.update({
    where: { id: workflow.id },
    data: { lastRunAt: new Date() },
  });
  await enqueueExecution({ executionId: execution.id });
  return execution;
}

function extractTopics(definition: WorkflowDefinition) {
  const research = definition.steps.find((step) => step.type === "research");
  const topics = research?.config?.topics;
  return typeof topics === "string" ? topics : Array.isArray(topics) ? topics.join(", ") : undefined;
}

function extractInstructions(definition: WorkflowDefinition) {
  const llm = definition.steps.find((step) => step.type === "llm");
  return typeof llm?.config?.system === "string" ? llm.config.system : undefined;
}

export function serializeWorkflow(workflow: {
  id: string;
  name: string;
  description: string;
  definition: string;
  status: string;
  kind: string;
  nextRunAt: Date | null;
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...workflow,
    definition: JSON.parse(workflow.definition) as WorkflowDefinition,
  };
}
