import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { WorkflowEditor } from "@/components/workflow-editor";
import type { WorkflowDefinition } from "@/lib/engine/types";

export default async function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  const workflow = await prisma.workflow.findFirst({
    where: { id, userId: session!.user.id },
  });
  if (!workflow) notFound();
  return (
    <WorkflowEditor
      workflow={{
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        status: workflow.status,
        definition: JSON.parse(workflow.definition) as WorkflowDefinition,
      }}
    />
  );
}
