import { frequencyToCron } from "./cron";
import type { WorkflowDefinition } from "./engine/types";
import { defaultModel } from "./llm/models";

export type AutopilotInput = {
  topics: string;
  frequency: string;
  time: string;
  instructions: string;
  model?: string;
};

export function buildAutopilotDefinition(input: AutopilotInput): WorkflowDefinition {
  const cron = frequencyToCron(input.frequency, input.time);
  const model = input.model || defaultModel();
  const instructions =
    input.instructions.trim() ||
    "Write like an experienced software engineer.\nDon't sound like AI.\nUse practical examples.";

  return {
    version: 1,
    trigger: { type: "schedule", cron },
    steps: [
      {
        id: "research",
        type: "research",
        name: "Research",
        config: { topics: input.topics, model },
      },
      {
        id: "write",
        type: "llm",
        name: "Write post",
        config: {
          model,
          system: `You are an expert LinkedIn writer. ${instructions}`,
          user: "Write a LinkedIn post about {{research.topic}}.\n\nResearch notes:\n{{research.notes}}\n\nReturn only the post text. No title, no hashtags unless they are genuinely useful.",
        },
      },
      {
        id: "risk",
        type: "risk_check",
        name: "Risk check",
        config: { content: "{{write}}" },
      },
      {
        id: "branch",
        type: "condition",
        name: "Risk branch",
        next: {
          expression: 'risk.level == "HIGH"',
          then: "approval",
          else: "publish",
        },
      },
      {
        id: "approval",
        type: "approval",
        name: "Human approval",
        config: { content: "{{write}}" },
        next: "publish",
      },
      {
        id: "publish",
        type: "linkedin",
        name: "LinkedIn Publish",
        config: { content: "{{write}}" },
      },
    ],
  };
}

export const DEFAULT_AUTOPILOT: AutopilotInput = {
  topics: "AI engineering, startups, programming, SaaS",
  frequency: "every_weekday",
  time: "09:00 AM",
  instructions:
    "Write like an experienced software engineer.\nDon't sound like AI.\nUse practical examples.",
};
