import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { AutopilotForm } from "@/components/autopilot-form";
import { DEFAULT_AUTOPILOT } from "@/lib/autopilot";
import { getLinkedInStatus } from "@/lib/services/linkedin";
import type { WorkflowDefinition } from "@/lib/engine/types";

export default async function AutopilotPage() {
  const session = await auth();
  const userId = session!.user.id;
  const [linkedin, workflow] = await Promise.all([
    getLinkedInStatus(userId),
    prisma.workflow.findFirst({
      where: { userId, kind: "linkedin_autopilot" },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  let defaults = DEFAULT_AUTOPILOT;
  if (workflow) {
    const definition = JSON.parse(workflow.definition) as WorkflowDefinition;
    const topics = String(definition.steps.find((s) => s.type === "research")?.config?.topics ?? defaults.topics);
    const system = String(definition.steps.find((s) => s.type === "llm")?.config?.system ?? "");
    defaults = {
      ...defaults,
      topics,
      instructions: system.replace(/^You are an expert LinkedIn writer\.\s*/, "") || defaults.instructions,
    };
  }

  return (
    <AutopilotForm
      linkedin={linkedin}
      defaults={defaults}
      workflow={workflow ? { id: workflow.id, status: workflow.status } : null}
    />
  );
}
