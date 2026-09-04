export type LLMMessage = { role: "system" | "user" | "assistant"; content: string };

export type LLMRequest = {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
};

export type LLMResponse = {
  text: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  provider: string;
};

export interface LLMProvider {
  id: string;
  complete(request: LLMRequest, apiKey?: string): Promise<LLMResponse>;
}

function estimateCost(model: string, tokensIn: number, tokensOut: number) {
  const table: Record<string, { in: number; out: number }> = {
    "openrouter/free": { in: 0, out: 0 },
    "google/gemma-4-31b-it:free": { in: 0, out: 0 },
    "z-ai/glm-5.2:free": { in: 0, out: 0 },
    "minimax/minimax-m3:free": { in: 0, out: 0 },
    "google/gemini-2.5-flash-lite": { in: 0.05, out: 0.2 },
    "openai/gpt-4o-mini": { in: 0.15, out: 0.6 },
    "openai/gpt-4o": { in: 2.5, out: 10 },
    "anthropic/claude-3.5-sonnet": { in: 3, out: 15 },
  };
  const rates = table[model] ?? (model.endsWith(":free") || model === "openrouter/free" ? { in: 0, out: 0 } : { in: 0.05, out: 0.2 });
  return (tokensIn * rates.in + tokensOut * rates.out) / 1_000_000;
}

async function openAiCompatible(
  provider: string,
  baseUrl: string,
  apiKey: string | undefined,
  request: LLMRequest,
): Promise<LLMResponse> {
  if (!apiKey) {
    throw new Error(`${provider} API key is missing`);
  }
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
      "X-Title": "Postara",
    },
    body: JSON.stringify({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 800,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${provider} request failed: ${response.status} ${body.slice(0, 240)}`);
  }
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  const tokensIn = json.usage?.prompt_tokens ?? 0;
  const tokensOut = json.usage?.completion_tokens ?? 0;
  return {
    text,
    model: json.model ?? request.model,
    tokensIn,
    tokensOut,
    costUsd: estimateCost(request.model, tokensIn, tokensOut),
    provider,
  };
}

export const openRouterProvider: LLMProvider = {
  id: "openrouter",
  complete: (request, apiKey) =>
    openAiCompatible(
      "openrouter",
      "https://openrouter.ai/api/v1",
      apiKey ?? process.env.OPENROUTER_API_KEY,
      request,
    ),
};

export const openAiProvider: LLMProvider = {
  id: "openai",
  complete: (request, apiKey) =>
    openAiCompatible(
      "openai",
      "https://api.openai.com/v1",
      apiKey ?? process.env.OPENAI_API_KEY,
      request,
    ),
};

export const anthropicProvider: LLMProvider = {
  id: "anthropic",
  async complete(request, apiKey) {
    const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("Anthropic API key is missing");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model.replace(/^anthropic\//, ""),
        max_tokens: request.maxTokens ?? 800,
        system: request.messages.find((m) => m.role === "system")?.content,
        messages: request.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Anthropic request failed: ${response.status} ${body.slice(0, 240)}`);
    }
    const json = (await response.json()) as {
      content?: Array<{ text?: string }>;
      model?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const tokensIn = json.usage?.input_tokens ?? 0;
    const tokensOut = json.usage?.output_tokens ?? 0;
    return {
      text: json.content?.map((part) => part.text ?? "").join("\n") ?? "",
      model: json.model ?? request.model,
      tokensIn,
      tokensOut,
      costUsd: estimateCost(request.model, tokensIn, tokensOut),
      provider: "anthropic",
    };
  },
};

export const customProvider: LLMProvider = {
  id: "custom",
  complete: (request, apiKey) =>
    openAiCompatible(
      "custom",
      process.env.CUSTOM_LLM_BASE_URL || "http://localhost:11434/v1",
      apiKey ?? process.env.CUSTOM_LLM_API_KEY ?? "ollama",
      request,
    ),
};

export const providers: Record<string, LLMProvider> = {
  openrouter: openRouterProvider,
  openai: openAiProvider,
  anthropic: anthropicProvider,
  custom: customProvider,
};

export function resolveProvider(model: string, preferred?: string): LLMProvider {
  if (preferred && providers[preferred]) return providers[preferred];
  if (model.startsWith("openai/") || model.startsWith("google/") || model.includes("/")) {
    return openRouterProvider;
  }
  if (model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3")) {
    return openAiProvider;
  }
  if (model.startsWith("claude")) return anthropicProvider;
  if (process.env.OPENROUTER_API_KEY) return openRouterProvider;
  if (process.env.OPENAI_API_KEY) return openAiProvider;
  if (process.env.ANTHROPIC_API_KEY) return anthropicProvider;
  return customProvider;
}
