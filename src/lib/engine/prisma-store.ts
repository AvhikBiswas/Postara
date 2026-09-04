import { prisma } from "@/lib/db";
import type { ExecutionContext, WorkflowDefinition } from "./types";
import type { EngineStore } from "./engine";

export const prismaEngineStore: EngineStore = {
  async getExecution(id) {
    const execution = await prisma.execution.findUniqueOrThrow({
      where: { id },
      include: { workflow: true },
    });
    return {
      id: execution.id,
      publicId: execution.publicId,
      status: execution.status as never,
      context: JSON.parse(execution.context) as ExecutionContext,
      definition: JSON.parse(execution.workflow.definition) as WorkflowDefinition,
    };
  },
  async updateExecution(id, data) {
    await prisma.execution.update({
      where: { id },
      data: {
        status: data.status,
        context: data.context ? JSON.stringify(data.context) : undefined,
        error: data.error === undefined ? undefined : data.error,
        startedAt: data.startedAt,
        finishedAt: data.finishedAt === undefined ? undefined : data.finishedAt,
      },
    });
  },
  async upsertNode(executionId, input) {
    const existing = await prisma.executionNode.findFirst({
      where: { executionId, stepId: input.stepId },
    });
    const data = {
      type: input.type,
      name: input.name,
      status: input.status,
      input: JSON.stringify(input.input ?? {}),
      output: JSON.stringify(input.output ?? {}),
      error: input.error ?? null,
      model: input.model ?? null,
      tokensIn: input.tokensIn ?? 0,
      tokensOut: input.tokensOut ?? 0,
      costUsd: input.costUsd ?? 0,
      durationMs: input.durationMs ?? 0,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt ?? null,
      sortOrder: input.sortOrder,
    };
    if (existing) {
      await prisma.executionNode.update({ where: { id: existing.id }, data });
      return;
    }
    await prisma.executionNode.create({
      data: { executionId, stepId: input.stepId, ...data },
    });
  },
  async emit(executionId, event, message, data) {
    await prisma.executionEvent.create({
      data: {
        executionId,
        type: event.type,
        message,
        data: JSON.stringify(data ?? event),
      },
    });
    emitLocal(executionId, { ...event, message, data });
  },
};

type Listener = (event: unknown) => void;
const listeners = new Map<string, Set<Listener>>();

export function subscribeExecution(executionId: string, listener: Listener) {
  const set = listeners.get(executionId) ?? new Set();
  set.add(listener);
  listeners.set(executionId, set);
  return () => {
    set.delete(listener);
  };
}

export function emitLocal(executionId: string, event: unknown) {
  const set = listeners.get(executionId);
  if (!set) return;
  for (const listener of set) listener(event);
}
