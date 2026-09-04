import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireSession, sameOrigin } from "@/lib/api";
import { buildAutopilotDefinition, DEFAULT_AUTOPILOT } from "@/lib/autopilot";
import { saveWorkflow, serializeWorkflow } from "@/lib/services/workflows";
import { getLinkedInStatus } from "@/lib/services/linkedin";
import { describeCron } from "@/lib/cron";
import type { WorkflowDefinition } from "@/lib/engine/types";

export async function GET(request: Request) {
  try {
    const user = await requireSession(request);
    const workflow = await prisma.workflow.findFirst({
      where: { userId: user.id, kind: "linkedin_autopilot" },
      orderBy: { updatedAt: "desc" },
    });
    const linkedin = await getLinkedInStatus(user.id);
    if (!workflow) {
      return NextResponse.json({
        workflow: null,
        linkedin,
        defaults: DEFAULT_AUTOPILOT,
      });
    }
    const definition = JSON.parse(workflow.definition) as WorkflowDefinition;
    return NextResponse.json({
      workflow: {
        ...serializeWorkflow(workflow),
        scheduleLabel:
          definition.trigger.type === "schedule" ? describeCron(definition.trigger.cron) : "Manual",
        topics: definition.steps.find((s) => s.type === "research")?.config?.topics ?? "",
        instructions: definition.steps.find((s) => s.type === "llm")?.config?.system ?? "",
      },
      linkedin,
      defaults: DEFAULT_AUTOPILOT,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: "CSRF" }, { status: 403 });
    const user = await requireSession(request);
    const body = (await request.json()) as {
      topics?: string;
      frequency?: string;
      time?: string;
      instructions?: string;
      status?: string;
    };
    const existing = await prisma.workflow.findFirst({
      where: { userId: user.id, kind: "linkedin_autopilot" },
    });
    const definition = buildAutopilotDefinition({
      topics: body.topics || DEFAULT_AUTOPILOT.topics,
      frequency: body.frequency || DEFAULT_AUTOPILOT.frequency,
      time: body.time || DEFAULT_AUTOPILOT.time,
      instructions: body.instructions || DEFAULT_AUTOPILOT.instructions,
    });
    const workflow = await saveWorkflow({
      id: existing?.id,
      userId: user.id,
      name: "LinkedIn Autopilot",
      description: `Post about ${body.topics || DEFAULT_AUTOPILOT.topics}`,
      definition,
      status: body.status ?? "active",
      kind: "linkedin_autopilot",
    });
    return NextResponse.json(serializeWorkflow(workflow));
  } catch (error) {
    return jsonError(error);
  }
}
