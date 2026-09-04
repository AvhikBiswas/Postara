import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ExecutionView } from "@/components/execution-view";

export default async function ExecutionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  const execution = await prisma.execution.findFirst({
    where: { userId: session!.user.id, OR: [{ id }, { publicId: id }] },
    include: { nodes: { orderBy: { sortOrder: "asc" } } },
  });
  if (!execution) notFound();
  return (
    <ExecutionView
      initial={{
        id: execution.id,
        publicId: execution.publicId,
        status: execution.status,
        error: execution.error,
        nodes: execution.nodes.map((node) => ({
          ...node,
          input: JSON.parse(node.input || "{}"),
          output: JSON.parse(node.output || "{}"),
        })),
      }}
    />
  );
}
