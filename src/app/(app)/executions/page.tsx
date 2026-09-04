import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Badge, Card } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";

export default async function ExecutionsPage() {
  const session = await auth();
  const executions = await prisma.execution.findMany({
    where: { userId: session!.user.id },
    include: { workflow: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return (
    <div className="space-y-6">
      <h1 className="display text-5xl">Executions</h1>
      <div className="space-y-3">
        {executions.map((execution) => (
          <Link key={execution.id} href={`/executions/${execution.id}`}>
            <Card className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{execution.publicId}</p>
                <p className="text-sm text-muted">
                  {execution.workflow.name} · {formatDateTime(execution.createdAt)}
                </p>
              </div>
              <Badge
                tone={
                  execution.status === "SUCCESS"
                    ? "good"
                    : execution.status === "FAILED"
                      ? "bad"
                      : "warn"
                }
              >
                {execution.status}
              </Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
