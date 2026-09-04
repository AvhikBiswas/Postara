export const NODE_TYPES = [
  "schedule",
  "manual",
  "llm",
  "http",
  "condition",
  "email",
  "approval",
  "linkedin",
  "research",
  "risk_check",
] as const;

export type NodeType = (typeof NODE_TYPES)[number];

export const EXECUTION_STATUSES = [
  "PENDING",
  "RUNNING",
  "SUCCESS",
  "FAILED",
  "WAITING_APPROVAL",
  "CANCELLED",
] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export type TriggerDefinition =
  | { type: "schedule"; cron: string; timezone?: string }
  | { type: "manual" };

export type ConditionNext = {
  expression: string;
  then?: string;
  else?: string;
};

export type WorkflowStep = {
  id: string;
  type: NodeType;
  name?: string;
  config?: Record<string, unknown>;
  next?: string | ConditionNext;
};

export type WorkflowDefinition = {
  version: 1;
  trigger: TriggerDefinition;
  steps: WorkflowStep[];
};

export type NodeRunStatus = ExecutionStatus;

export type LLMUsage = {
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
};

export type NodeRunResult = {
  status: "SUCCESS" | "FAILED" | "WAITING_APPROVAL";
  output?: unknown;
  error?: string;
  usage?: LLMUsage;
};

export type ExecutionContext = {
  user: { id: string; name: string; email: string };
  topic?: string;
  topics?: string | string[];
  instructions?: string;
  date: string;
  previous_post?: string;
  research?: unknown;
  steps: Record<string, unknown>;
  [key: string]: unknown;
};

export type EngineEvent =
  | { type: "execution.started"; executionId: string }
  | { type: "execution.completed"; executionId: string; status: ExecutionStatus }
  | {
      type: "node.started";
      executionId: string;
      stepId: string;
      nodeType: NodeType;
    }
  | {
      type: "node.completed";
      executionId: string;
      stepId: string;
      status: NodeRunStatus;
    }
  | { type: "execution.waiting"; executionId: string; stepId: string }
  | { type: "execution.failed"; executionId: string; error: string };

export type NodeHandler = (args: {
  step: WorkflowStep;
  context: ExecutionContext;
  interpolate: (value: unknown) => unknown;
}) => Promise<NodeRunResult>;
