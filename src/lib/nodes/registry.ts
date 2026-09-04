import { classifyRisk } from "@/lib/engine/risk";
import type { NodeHandler } from "@/lib/engine/types";
import { completeLLM } from "@/lib/llm/complete";
import { readUserSecret } from "@/lib/services/secrets";
import { assertPublicHttpUrl } from "./http-guard";

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

async function userKey(userId: string | undefined, provider?: string) {
  if (!userId) return undefined;
  try {
    const preferred = provider || "openrouter";
    return (
      (await readUserSecret(userId, preferred)) ||
      (await readUserSecret(userId, "openrouter")) ||
      (await readUserSecret(userId, "openai")) ||
      (await readUserSecret(userId, "anthropic")) ||
      undefined
    );
  } catch {
    return undefined;
  }
}

export const nodeHandlers: Record<string, NodeHandler> = {
  async schedule() {
    return { status: "SUCCESS", output: { triggered: "schedule" } };
  },
  async manual() {
    return { status: "SUCCESS", output: { triggered: "manual" } };
  },
  async llm({ step, context }) {
    const config = (step.config ?? {}) as Record<string, unknown>;
    const result = await completeLLM({
      model: asString(config.model) || undefined,
      provider: asString(config.provider) || undefined,
      system: asString(
        config.system,
        "You are a precise assistant inside the Postara workflow engine.",
      ),
      user: asString(config.user ?? config.prompt, "Continue the workflow."),
      context,
      apiKey: await userKey(context.user?.id, asString(config.provider) || undefined),
      temperature: typeof config.temperature === "number" ? config.temperature : undefined,
    });
    return {
      status: "SUCCESS",
      output: result.text,
      usage: {
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        costUsd: result.costUsd,
      },
    };
  },
  async research({ step, context, interpolate }) {
    const config = (step.config ?? {}) as Record<string, unknown>;
    const topics = interpolate(config.topics ?? context.topics ?? context.topic);
    const topicText = Array.isArray(topics) ? topics.join(", ") : asString(topics, "AI engineering");
    const picked = topicText.split(",")[Math.floor(Date.now() / 86_400_000) % topicText.split(",").length]?.trim()
      ?? topicText;
    const result = await completeLLM({
      model: asString(config.model) || undefined,
      system:
        "You research a topic for a LinkedIn post. Return compact notes: headline, why it matters, 3 concrete facts, and one opinionated angle. No hashtags.",
      user: `Research this topic for a practitioner audience: ${picked}`,
      context: { ...context, topic: picked },
      apiKey: await userKey(context.user?.id, asString(config.provider) || undefined),
    });
    return {
      status: "SUCCESS",
      output: {
        topic: picked,
        notes: result.text,
        toString() {
          return result.text;
        },
      },
      usage: {
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        costUsd: result.costUsd,
      },
    };
  },
  async risk_check({ step, context, interpolate }) {
    const config = (step.config ?? {}) as Record<string, unknown>;
    const content = asString(
      interpolate(config.content ?? context.write ?? context.steps?.write),
    );
    const heuristic = classifyRisk(content);
    return { status: "SUCCESS", output: heuristic };
  },
  async http({ step, interpolate }) {
    const config = (step.config ?? {}) as Record<string, unknown>;
    const url = assertPublicHttpUrl(asString(interpolate(config.url)));
    const method = asString(config.method, "GET").toUpperCase();
    const headers = (interpolate(config.headers ?? {}) ?? {}) as Record<string, string>;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(config.timeoutMs ?? 15_000));
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method === "GET" || method === "HEAD" ? undefined : JSON.stringify(interpolate(config.body)),
        signal: controller.signal,
      });
      const text = await response.text();
      let parsed: unknown = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text.slice(0, 4000);
      }
      return {
        status: response.ok ? "SUCCESS" : "FAILED",
        output: { status: response.status, body: parsed },
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  },
  async condition({ step }) {
    return {
      status: "SUCCESS",
      output: { expression: (step.config as { expression?: string } | undefined)?.expression ?? step.next },
    };
  },
  async email({ step, interpolate }) {
    const config = (step.config ?? {}) as Record<string, unknown>;
    const to = asString(interpolate(config.to));
    const subject = asString(interpolate(config.subject), "Message from Postara");
    const body = asString(interpolate(config.body));
    if (process.env.RESEND_API_KEY && to) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? "Postara <noreply@localhost>",
          to,
          subject,
          text: body,
        }),
      });
    }
    return { status: "SUCCESS", output: { to, subject, delivered: Boolean(process.env.RESEND_API_KEY) } };
  },
  async approval() {
    return { status: "WAITING_APPROVAL", output: { waiting: true } };
  },
  async linkedin({ step, interpolate }) {
    const config = (step.config ?? {}) as Record<string, unknown>;
    const content = asString(interpolate(config.content ?? "{{write}}"));
    return { status: "SUCCESS", output: { content, queued: true } };
  },
};
