function readPath(context: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let current: unknown = context;
  if (parts[0] && context.steps && typeof context.steps === "object") {
    const fromSteps = parts.reduce<unknown>((acc, part) => {
      if (acc == null || typeof acc !== "object") return undefined;
      return (acc as Record<string, unknown>)[part];
    }, (context.steps as Record<string, unknown>)[parts[0]] !== undefined ? context.steps : context);
    if (fromSteps !== undefined) return fromSteps;
  }
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function coerce(value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

export function evaluateCondition(
  expression: string,
  context: Record<string, unknown>,
): boolean {
  const trimmed = expression.trim();
  if (!trimmed) return false;

  const comparison = trimmed.match(
    /^([a-zA-Z0-9_.]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/,
  );
  if (comparison) {
    const left = readPath(context, comparison[1]);
    const operator = comparison[2];
    let rawRight = comparison[3].trim();
    if (
      (rawRight.startsWith('"') && rawRight.endsWith('"')) ||
      (rawRight.startsWith("'") && rawRight.endsWith("'"))
    ) {
      rawRight = rawRight.slice(1, -1);
    }
    const right = coerce(rawRight);
    const leftValue = coerce(left);
    switch (operator) {
      case "==":
        return leftValue == right;
      case "!=":
        return leftValue != right;
      case ">":
        return Number(leftValue) > Number(right);
      case "<":
        return Number(leftValue) < Number(right);
      case ">=":
        return Number(leftValue) >= Number(right);
      case "<=":
        return Number(leftValue) <= Number(right);
      default:
        return false;
    }
  }

  const value = readPath(context, trimmed);
  return Boolean(value);
}
