import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Badge, Card } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";

export default async function WorkflowsPage() {
  const session = await auth();
  const workflows = await prisma.workflow.findMany({
    where: { userId: session!.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-muted">Advanced</p>
          <h1 className="display text-5xl">Workflows</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/workflows/new" className="rounded-full bg-ink px-4 py-2 text-sm text-bg-elevated">
            New workflow
          </Link>
          <Link href="/workflows/ai" className="rounded-full border border-line px-4 py-2 text-sm">
            AI builder
          </Link>
          <Link href="/workflows/import" className="rounded-full border border-line px-4 py-2 text-sm">
            Import JSON
          </Link>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {workflows.map((workflow) => (
          <Link key={workflow.id} href={`/workflows/${workflow.id}`}>
            <Card className="p-5 transition hover:border-ink">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">{workflow.name}</h2>
                <Badge tone={workflow.status === "active" ? "good" : "neutral"}>{workflow.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted">{workflow.description || "No description"}</p>
              <p className="mt-3 text-xs text-muted">Updated {formatDateTime(workflow.updatedAt)}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
