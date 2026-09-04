import { parseWorkflowDefinition } from "./engine/schema";
import type { WorkflowDefinition } from "./engine/types";
import { completeLLM } from "./llm/complete";

const SYSTEM = `You create Postara workflow JSON.
Return ONLY valid JSON matching:
{
  "version": 1,
  "trigger": { "type": "schedule", "cron": "0 9 * * 1-5" } | { "type": "manual" },
  "steps": [
    { "id": "unique_id", "type": "research|llm|http|condition|email|approval|linkedin|risk_check|schedule|manual", "name": "Human name", "config": {}, "next": "id" | { "expression": "risk.level == \\"HIGH\\"", "then": "approval", "else": "publish" } }
  ]
}
Allowed node types only: schedule, manual, llm, http, condition, email, approval, linkedin, research, risk_check.
Prefer a LinkedIn autopilot shape when the user mentions posting.
Do not invent integrations that are not in the node list.`;

export async function generateWorkflowFromPrompt(prompt: string): Promise<WorkflowDefinition> {
  const result = await completeLLM({
    system: SYSTEM,
    user: prompt,
    temperature: 0.2,
  });
  const json = extractJson(result.text);
  return parseWorkflowDefinition(json);
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) {
    throw new Error("The model did not return workflow JSON");
  }
  return JSON.parse(raw.slice(start, end + 1));
}
