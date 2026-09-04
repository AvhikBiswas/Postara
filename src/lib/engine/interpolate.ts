function getPath(source: unknown, path: string): unknown {
  if (source == null) return undefined;
  const parts = path.split(".").filter(Boolean);
  let current: unknown = source;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function stringifyValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function interpolateString(
  template: string,
  context: Record<string, unknown>,
): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, rawPath: string) => {
    const path = rawPath.trim();
    const fromSteps = path.startsWith("steps.")
      ? getPath(context, path)
      : getPath((context.steps as Record<string, unknown> | undefined) ?? {}, path);
    const direct = getPath(context, path);
    const value = direct !== undefined ? direct : fromSteps;
    return stringifyValue(value);
  });
}

export function interpolateValue(
  value: unknown,
  context: Record<string, unknown>,
): unknown {
  if (typeof value === "string") return interpolateString(value, context);
  if (Array.isArray(value)) return value.map((item) => interpolateValue(item, context));
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      next[key] = interpolateValue(nested, context);
    }
    return next;
  }
  return value;
}
