import { evaluateCondition } from "./condition";
import { interpolateValue } from "./interpolate";
import { assertStepGraph, parseWorkflowDefinition } from "./schema";
import type {
  EngineEvent,
  ExecutionContext,
  ExecutionStatus,
  NodeHandler,
  NodeRunResult,
  WorkflowDefinition,
  WorkflowStep,
} from "./types";

export type EngineStore = {
  getExecution(id: string): Promise<{
    id: string;
    publicId: string;
    status: ExecutionStatus;
    context: ExecutionContext;
    definition: WorkflowDefinition;
    currentStepId?: string | null;
  }>;
  updateExecution(
    id: string,
    data: {
      status?: ExecutionStatus;
      context?: ExecutionContext;
      error?: string | null;
      startedAt?: Date;
      finishedAt?: Date | null;
    },
  ): Promise<void>;
  upsertNode(
    executionId: string,
    input: {
      stepId: string;
      type: string;
      name: string;
      sortOrder: number;
      status: ExecutionStatus;
      input?: unknown;
      output?: unknown;
      error?: string | null;
      model?: string | null;
      tokensIn?: number;
      tokensOut?: number;
      costUsd?: number;
      durationMs?: number;
      startedAt?: Date;
      finishedAt?: Date | null;
    },
  ): Promise<void>;
  emit(executionId: string, event: EngineEvent, message: string, data?: unknown): Promise<void>;
};

export class WorkflowEngine {
  constructor(
    private readonly store: EngineStore,
    private readonly handlers: Record<string, NodeHandler>,
  ) {}

  async run(executionId: string, resumeFrom?: string) {
    const execution = await this.store.getExecution(executionId);
    const definition = parseWorkflowDefinition(execution.definition);
    assertStepGraph(definition);

    if (execution.status === "CANCELLED") return execution;
    if (execution.status === "SUCCESS") return execution;

    await this.store.updateExecution(executionId, {
      status: "RUNNING",
      startedAt: execution.status === "PENDING" ? new Date() : undefined,
      finishedAt: null,
      error: null,
    });
    await this.store.emit(executionId, { type: "execution.started", executionId }, "Execution started");

    const context = execution.context;
    const startIndex = resumeFrom
      ? definition.steps.findIndex((step) => step.id === resumeFrom)
      : 0;
    if (startIndex < 0) {
      throw new Error(`Cannot resume from unknown step ${resumeFrom}`);
    }

    let index = startIndex;
    let resumeSkip = Boolean(resumeFrom);

    while (index < definition.steps.length) {
      const step = definition.steps[index];
      if (resumeSkip) {
        resumeSkip = false;
        const nextIndex = this.nextIndex(definition, step, context, index);
        if (nextIndex == null) break;
        index = nextIndex;
        continue;
      }

      const result = await this.runStep(executionId, step, context, index);
      this.writeStepOutput(context, step, result.output);

      if (result.status === "FAILED") {
        await this.store.updateExecution(executionId, {
          status: "FAILED",
          context,
          error: result.error ?? `Step ${step.id} failed`,
          finishedAt: new Date(),
        });
        await this.store.emit(
          executionId,
          { type: "execution.failed", executionId, error: result.error ?? "failed" },
          result.error ?? `Step ${step.name ?? step.id} failed`,
        );
        return { ...execution, status: "FAILED" as const, context };
      }

      if (result.status === "WAITING_APPROVAL") {
        await this.store.updateExecution(executionId, {
          status: "WAITING_APPROVAL",
          context,
        });
        await this.store.emit(
          executionId,
          { type: "execution.waiting", executionId, stepId: step.id },
          `Waiting for approval on ${step.name ?? step.id}`,
        );
        return { ...execution, status: "WAITING_APPROVAL" as const, context };
      }

      const nextIndex = this.nextIndex(definition, step, context, index);
      if (nextIndex == null) break;
      index = nextIndex;
    }

    await this.store.updateExecution(executionId, {
      status: "SUCCESS",
      context,
      finishedAt: new Date(),
    });
    await this.store.emit(
      executionId,
      { type: "execution.completed", executionId, status: "SUCCESS" },
      "Execution completed",
    );
    return { ...execution, status: "SUCCESS" as const, context };
  }

  private nextIndex(
    definition: WorkflowDefinition,
    step: WorkflowStep,
    context: ExecutionContext,
    currentIndex: number,
  ) {
    if (step.type === "condition" || (step.next && typeof step.next === "object")) {
      const branch = typeof step.next === "object" ? step.next : undefined;
      const expression =
        branch?.expression ??
        (typeof step.config?.expression === "string" ? step.config.expression : "");
      const passed = evaluateCondition(expression, context);
      const target = passed ? branch?.then : branch?.else;
      if (!target) return null;
      const next = definition.steps.findIndex((item) => item.id === target);
      return next >= 0 ? next : null;
    }
    if (typeof step.next === "string") {
      const next = definition.steps.findIndex((item) => item.id === step.next);
      return next >= 0 ? next : null;
    }
    return currentIndex + 1 < definition.steps.length ? currentIndex + 1 : null;
  }

  private writeStepOutput(context: ExecutionContext, step: WorkflowStep, output: unknown) {
    context.steps[step.id] = output;
    context[step.id] = output;
    if (step.type === "research" && output && typeof output === "object") {
      context.research = output;
      const topic = (output as { topic?: string }).topic;
      if (topic) context.topic = topic;
    }
    if (step.type === "risk_check") {
      context.risk = output;
    }
  }

  private async runStep(
    executionId: string,
    step: WorkflowStep,
    context: ExecutionContext,
    sortOrder: number,
  ): Promise<NodeRunResult> {
    const startedAt = new Date();
    await this.store.upsertNode(executionId, {
      stepId: step.id,
      type: step.type,
      name: step.name ?? step.id,
      sortOrder,
      status: "RUNNING",
      input: step.config ?? {},
      startedAt,
    });
    await this.store.emit(
      executionId,
      { type: "node.started", executionId, stepId: step.id, nodeType: step.type },
      `${step.name ?? step.id} started`,
    );

    const handler = this.handlers[step.type];
    if (!handler) {
      const failed = { status: "FAILED" as const, error: `Unknown node type: ${step.type}` };
      await this.finishNode(executionId, step, sortOrder, failed, startedAt, {});
      return failed;
    }

    try {
      const result = await handler({
        step,
        context,
        interpolate: (value) => interpolateValue(value, context),
      });
      await this.finishNode(executionId, step, sortOrder, result, startedAt, step.config ?? {});
      return result;
    } catch (error) {
      const result = {
        status: "FAILED" as const,
        error: error instanceof Error ? error.message : "Node failed",
      };
      await this.finishNode(executionId, step, sortOrder, result, startedAt, step.config ?? {});
      return result;
    }
  }

  private async finishNode(
    executionId: string,
    step: WorkflowStep,
    sortOrder: number,
    result: NodeRunResult,
    startedAt: Date,
    input: unknown,
  ) {
    const finishedAt = new Date();
    await this.store.upsertNode(executionId, {
      stepId: step.id,
      type: step.type,
      name: step.name ?? step.id,
      sortOrder,
      status: result.status,
      input,
      output: result.output ?? null,
      error: result.error ?? null,
      model: result.usage?.model ?? null,
      tokensIn: result.usage?.tokensIn ?? 0,
      tokensOut: result.usage?.tokensOut ?? 0,
      costUsd: result.usage?.costUsd ?? 0,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      startedAt,
      finishedAt,
    });
    await this.store.emit(
      executionId,
      { type: "node.completed", executionId, stepId: step.id, status: result.status },
      `${step.name ?? step.id} ${result.status.toLowerCase()}`,
    );
  }
}
