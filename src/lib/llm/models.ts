/** OpenRouter free-tier router — picks an available $0 model. */
export const DEFAULT_LLM_MODEL = "openrouter/free";

export const RECOMMENDED_MODELS = [
  { id: "openrouter/free", label: "Free router (default)", note: "$0 — OpenRouter picks a live free model" },
  { id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B free", note: "$0 — good LinkedIn writing" },
  { id: "z-ai/glm-5.2:free", label: "GLM 5.2 free", note: "$0 — solid general writer" },
  { id: "minimax/minimax-m3:free", label: "MiniMax M3 free", note: "$0 — longer posts" },
  { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", note: "Cheap paid fallback if free is rate-limited" },
] as const;

export function defaultModel() {
  return process.env.DEFAULT_LLM_MODEL || DEFAULT_LLM_MODEL;
}
