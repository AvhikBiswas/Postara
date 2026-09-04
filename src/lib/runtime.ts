import { WorkflowEngine } from "./engine/engine";
import { prismaEngineStore } from "./engine/prisma-store";
import { nodeHandlers } from "./nodes/registry";
import { startQueue } from "./queue";
import { tickDueWorkflows } from "./scheduler";
import { createApprovalForExecution, sendApprovalEmail } from "./services/approvals";
import { publishLinkedInForExecution } from "./services/linkedin";
import { ensureSeeded } from "./services/bootstrap";

let started = false;

export function getEngine() {
  return new WorkflowEngine(prismaEngineStore, nodeHandlers);
}

export async function handleExecutionJob({
  executionId,
  resumeFrom,
}: {
  executionId: string;
  resumeFrom?: string;
}) {
  const engine = getEngine();
  const result = await engine.run(executionId, resumeFrom);
  if (result.status === "WAITING_APPROVAL") {
    const approval = await createApprovalForExecution(executionId);
    if (approval) await sendApprovalEmail(approval.id);
  }
  if (result.status === "SUCCESS") {
    await publishLinkedInForExecution(executionId);
  }
}

export async function startRuntime() {
  if (started) return;
  started = true;
  await ensureSeeded();
  if (process.env.VERCEL) return;

  const role = process.env.POSTARA_ROLE ?? "all";
  const isolatedWeb = role === "web" && Boolean(process.env.REDIS_URL);
  if (isolatedWeb) return;

  await startQueue(handleExecutionJob);
  startScheduler();
}

function startScheduler() {
  const tick = () =>
    tickDueWorkflows().catch((error) => console.error("[postara.scheduler]", error));
  setInterval(tick, 20_000);
  void tick();
}
