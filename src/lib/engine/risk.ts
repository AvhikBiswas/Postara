const HIGH_RISK_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern:
      /\b(election|democrat|republican| MAGA |president trump|president biden|vote for|political party)\b/i,
    reason: "Political topic detected.",
  },
  {
    pattern: /\b(genocide|ethnic cleansing|war crime|terrorist attack)\b/i,
    reason: "Violent or atrocity-related topic detected.",
  },
  {
    pattern: /\b(guaranteed returns|get rich quick|insider trading|buy this stock now)\b/i,
    reason: "Financial advice / investment solicitation detected.",
  },
  {
    pattern:
      /\b(cure cancer|miracle drug|this supplement will|diagnose yourself)\b/i,
    reason: "Unsupported medical claim detected.",
  },
  {
    pattern: /\b(kill (them|yourself)|hate all|racial slur)\b/i,
    reason: "Hate or violent language detected.",
  },
];

export type RiskResult = {
  level: "LOW" | "HIGH";
  reason: string;
  flags: string[];
};

export function classifyRisk(content: string): RiskResult {
  const flags: string[] = [];
  const reasons: string[] = [];
  for (const rule of HIGH_RISK_PATTERNS) {
    if (rule.pattern.test(content)) {
      flags.push(rule.reason);
      reasons.push(rule.reason);
    }
  }
  if (reasons.length === 0) {
    return { level: "LOW", reason: "No high-risk signals detected.", flags };
  }
  return { level: "HIGH", reason: reasons[0], flags };
}
