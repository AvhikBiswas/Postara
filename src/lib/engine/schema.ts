import { z } from "zod";
import { NODE_TYPES, type WorkflowDefinition } from "./types";

const conditionNextSchema = z.object({
  expression: z.string().min(1),
  then: z.string().optional(),
  else: z.string().optional(),
});

const stepSchema = z.object({
  id: z.string().min(1),
  type: z.enum(NODE_TYPES),
  name: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  next: z.union([z.string(), conditionNextSchema]).optional(),
});

export const workflowDefinitionSchema = z.object({
  version: z.literal(1),
  trigger: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("schedule"),
      cron: z.string().min(1),
      timezone: z.string().optional(),
    }),
    z.object({
      type: z.literal("manual"),
    }),
  ]),
  steps: z.array(stepSchema).min(1),
});

export function parseWorkflowDefinition(input: unknown): WorkflowDefinition {
  return workflowDefinitionSchema.parse(input) as WorkflowDefinition;
}

export function safeParseWorkflowDefinition(input: unknown) {
  return workflowDefinitionSchema.safeParse(input);
}

export function assertStepGraph(definition: WorkflowDefinition) {
  const ids = new Set(definition.steps.map((step) => step.id));
  if (ids.size !== definition.steps.length) {
    throw new Error("Workflow step ids must be unique");
  }
  for (const step of definition.steps) {
    if (typeof step.next === "string" && !ids.has(step.next)) {
      throw new Error(`Step ${step.id} points to missing next step ${step.next}`);
    }
    if (step.next && typeof step.next === "object") {
      if (step.next.then && !ids.has(step.next.then)) {
        throw new Error(`Step ${step.id} then-branch points to missing step`);
      }
      if (step.next.else && !ids.has(step.next.else)) {
        throw new Error(`Step ${step.id} else-branch points to missing step`);
      }
    }
  }
}
