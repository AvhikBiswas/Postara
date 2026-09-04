import { classifyRisk } from "@/lib/engine/risk";
import { interpolateString } from "@/lib/engine/interpolate";
import { resolveProvider, type LLMResponse } from "./providers";

const DEMO_POSTS = [
  `Most "AI agent" demos skip the boring part: state.

If the workflow cannot pause, resume, and remember what already happened, it is not an agent. It is a script with extra words.

I keep a tiny rule now: every step writes its output, every run has an id, and humans can interrupt before anything public happens.

Unsexy. Extremely useful.`,
  `A practical LinkedIn habit that compounded for me:

Write the post you would send a teammate in Slack. Then delete the first sentence.

The first sentence is usually the AI throat-clearing. The second sentence is the point.

Ship the point.`,
  `SaaS founders keep asking for "an AI feature."

What they usually need is a workflow:

1. collect a messy input
2. do the expensive thinking once
3. ask a human only when the risk is high
4. write the result to the system of record

That last step is the product.`,
];

export function demoComplete(prompt: string): LLMResponse {
  const lowered = prompt.toLowerCase();
  if (lowered.includes("json") && lowered.includes("workflow")) {
    return {
      text: JSON.stringify(
        {
          version: 1,
          trigger: { type: "schedule", cron: "0 8 * * 1-5" },
          steps: [
            {
              id: "research",
              type: "research",
              name: "Research",
              config: { topics: "AI news" },
            },
            {
              id: "write",
              type: "llm",
              name: "Write post",
              config: {
                system: "You are an expert LinkedIn writer. Don't sound like AI.",
                user: "Write a post about {{research.topic}}.\n\n{{research}}",
              },
            },
            { id: "risk", type: "risk_check", name: "Risk check" },
            {
              id: "branch",
              type: "condition",
              name: "Risk branch",
              config: { expression: 'risk.level == "HIGH"' },
              next: { expression: 'risk.level == "HIGH"', then: "approval", else: "publish" },
            },
            { id: "approval", type: "approval", name: "Human approval", next: "publish" },
            { id: "publish", type: "linkedin", name: "Publish to LinkedIn" },
          ],
        },
        null,
        2,
      ),
      model: "postara-demo",
      tokensIn: 180,
      tokensOut: 220,
      costUsd: 0,
      provider: "demo",
    };
  }
  if (lowered.includes("risk")) {
    const risk = classifyRisk(prompt);
    return {
      text: JSON.stringify(risk),
      model: "postara-demo",
      tokensIn: 80,
      tokensOut: 40,
      costUsd: 0,
      provider: "demo",
    };
  }
  const index = Math.abs(prompt.length) % DEMO_POSTS.length;
  const topicMatch = prompt.match(/about\s+([^\n.]+)/i);
  const topic = topicMatch?.[1]?.trim() ?? "building in public";
  const risk = classifyRisk(prompt);
  const text =
    risk.level === "HIGH"
      ? `A take on ${topic}: this political party moment is noisy, but the engineering lesson still stands.\n\n${DEMO_POSTS[index]}`
      : DEMO_POSTS[index].replace("AI agent", topic).replace("SaaS founders", topic);
  return {
    text,
    model: "postara-demo",
    tokensIn: 210,
    tokensOut: 140,
    costUsd: 0,
    provider: "demo",
  };
}

export async function completeLLM(input: {
  model?: string;
  provider?: string;
  system?: string;
  user: string;
  context?: Record<string, unknown>;
  apiKey?: string;
  temperature?: number;
}): Promise<LLMResponse> {
  const model = input.model || process.env.DEFAULT_LLM_MODEL || "openai/gpt-4o-mini";
  const system = input.system
    ? interpolateString(input.system, input.context ?? {})
    : undefined;
  const user = interpolateString(input.user, input.context ?? {});
  const provider = resolveProvider(model, input.provider);
  const hasKey =
    input.apiKey ||
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.CUSTOM_LLM_API_KEY;

  if (!hasKey) {
    return demoComplete(`${system ?? ""}\n${user}`);
  }

  try {
    return await provider.complete(
      {
        model,
        messages: [
          ...(system ? [{ role: "system" as const, content: system }] : []),
          { role: "user", content: user },
        ],
        temperature: input.temperature,
      },
      input.apiKey,
    );
  } catch (error) {
    if (process.env.DEMO_MODE === "true") {
      return demoComplete(`${system ?? ""}\n${user}`);
    }
    throw error;
  }
}
