import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { AutomationPanel } from "@/components/automation-panel";
import { describeCron } from "@/lib/cron";
import type { WorkflowDefinition } from "@/lib/engine/types";

export default async function AutomationPage() {
  const session = await auth();
  const workflow = await prisma.workflow.findFirst({
    where: { userId: session!.user.id, kind: "linkedin_autopilot" },
    orderBy: { updatedAt: "desc" },
  });

  if (!workflow) {
    return (
      <div className="max-w-xl">
        <h1 className="display text-5xl">No autopilot yet</h1>
        <p className="mt-3 text-muted">Start from the simple screen. Postara will create the workflow for you.</p>
        <Link href="/autopilot" className="mt-6 inline-flex rounded-full bg-ink px-5 py-2 text-sm text-bg-elevated">
          Start Autopilot
        </Link>
      </div>
    );
  }

  const definition = JSON.parse(workflow.definition) as WorkflowDefinition;
  return (
    <AutomationPanel
      workflow={{
        id: workflow.id,
        name: workflow.name,
        status: workflow.status,
        nextRunAt: workflow.nextRunAt,
        lastRunAt: workflow.lastRunAt,
        scheduleLabel:
          definition.trigger.type === "schedule" ? describeCron(definition.trigger.cron) : "Manual",
      }}
    />
  );
}
