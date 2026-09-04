import { describe, expect, it } from "vitest";
import { interpolateString } from "../src/lib/engine/interpolate";
import { evaluateCondition } from "../src/lib/engine/condition";
import { classifyRisk } from "../src/lib/engine/risk";
import { parseWorkflowDefinition } from "../src/lib/engine/schema";
import { WorkflowEngine, type EngineStore } from "../src/lib/engine/engine";
import { nodeHandlers } from "../src/lib/nodes/registry";
import { buildAutopilotDefinition } from "../src/lib/autopilot";
import { signApprovalToken, verifyApprovalToken, approvalExpiry } from "../src/lib/approval-token";
import { encryptSecret, decryptSecret } from "../src/lib/secrets";
import { assertPublicHttpUrl } from "../src/lib/nodes/http-guard";
import { frequencyToCron } from "../src/lib/cron";
import type { ExecutionContext, ExecutionStatus, WorkflowDefinition } from "../src/lib/engine/types";

function memoryStore(definition: WorkflowDefinition): EngineStore & { status: ExecutionStatus; context: ExecutionContext } {
  const nodes = new Map<string, unknown>();
  const store: EngineStore & { status: ExecutionStatus; context: ExecutionContext } = {
    status: "PENDING" as ExecutionStatus,
    context: {
      user: { id: "u1", name: "Ada", email: "ada@example.com" },
      date: "2026-09-04",
      steps: {},
      topics: "AI engineering",
    },
    async getExecution() {
      return {
        id: "e1",
        publicId: "execution_10001",
        status: store.status,
        context: store.context,
        definition,
      };
    },
    async updateExecution(_id: string, data: { status?: ExecutionStatus; context?: ExecutionContext }) {
      if (data.status) store.status = data.status;
      if (data.context) store.context = data.context;
    },
    async upsertNode(_executionId: string, input: { stepId: string }) {
      nodes.set(input.stepId, input);
    },
    async emit() {},
  };
  return store;
}

describe("workflow schema", () => {
  it("parses the LinkedIn autopilot definition", () => {
    const definition = buildAutopilotDefinition({
      topics: "AI",
      frequency: "every_weekday",
      time: "09:00 AM",
      instructions: "Be useful.",
    });
    expect(parseWorkflowDefinition(definition).steps.map((s) => s.type)).toEqual([
      "research",
      "llm",
      "risk_check",
      "condition",
      "approval",
      "linkedin",
    ]);
  });
});

describe("interpolation", () => {
  it("resolves nested and step variables", () => {
    const text = interpolateString("Post about {{research.topic}} using {{write}}", {
      research: { topic: "agents" },
      write: "a short post",
      steps: {},
    });
    expect(text).toContain("agents");
    expect(text).toContain("a short post");
  });
});

describe("conditions", () => {
  it("evaluates risk.level", () => {
    expect(evaluateCondition('risk.level == "HIGH"', { risk: { level: "HIGH" }, steps: {} })).toBe(true);
    expect(evaluateCondition('risk.level == "HIGH"', { risk: { level: "LOW" }, steps: {} })).toBe(false);
  });
});

describe("risk classifier", () => {
  it("flags political content", () => {
    expect(classifyRisk("Vote for this political party tomorrow").level).toBe("HIGH");
    expect(classifyRisk("How I structure Next.js API routes").level).toBe("LOW");
  });
});

describe("security primitives", () => {
  it("encrypts secrets and signs approval tokens", () => {
    process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    process.env.APPROVAL_SIGNING_KEY = process.env.ENCRYPTION_KEY;
    const encrypted = encryptSecret("sk-test");
    expect(encrypted).not.toContain("sk-test");
    expect(decryptSecret(encrypted)).toBe("sk-test");
    const expiresAt = approvalExpiry(60_000);
    const token = signApprovalToken({ approvalId: "a1", executionId: "e1", expiresAt });
    expect(verifyApprovalToken(token).approvalId).toBe("a1");
  });

  it("blocks private HTTP targets", () => {
    expect(() => assertPublicHttpUrl("http://127.0.0.1/secrets")).toThrow();
    expect(() => assertPublicHttpUrl("https://example.com/ok")).not.toThrow();
  });
});

describe("engine", () => {
  it("auto-publishes a low-risk run without waiting", async () => {
    const definition = buildAutopilotDefinition({
      topics: "TypeScript internals",
      frequency: "every_weekday",
      time: "09:00 AM",
      instructions: "Practical.",
    });
    const store = memoryStore(definition);
    const engine = new WorkflowEngine(store, nodeHandlers);
    const result = await engine.run("e1");
    expect(result.status).toBe("SUCCESS");
    expect(store.status).toBe("SUCCESS");
    expect(typeof store.context.write).toBe("string");
  });

  it("pauses on high-risk content", async () => {
    const definition = parseWorkflowDefinition({
      version: 1,
      trigger: { type: "manual" },
      steps: [
        {
          id: "write",
          type: "llm",
          name: "Write",
          config: { user: "Write about election politics and vote for a political party" },
        },
        { id: "risk", type: "risk_check", config: { content: "{{write}}" } },
        {
          id: "branch",
          type: "condition",
          next: { expression: 'risk.level == "HIGH"', then: "approval", else: "publish" },
        },
        { id: "approval", type: "approval", next: "publish" },
        { id: "publish", type: "linkedin", config: { content: "{{write}}" } },
      ],
    });
    const store = memoryStore(definition);
    store.context.write = "Vote for this political party in the next election";
    const engine = new WorkflowEngine(store, {
      ...nodeHandlers,
      llm: async () => ({
        status: "SUCCESS",
        output: "Vote for this political party in the next election",
      }),
    });
    const result = await engine.run("e1");
    expect(result.status).toBe("WAITING_APPROVAL");
  });
});

describe("cron helpers", () => {
  it("maps weekday 9am", () => {
    expect(frequencyToCron("every_weekday", "09:00 AM")).toBe("0 9 * * 1-5");
  });
});
