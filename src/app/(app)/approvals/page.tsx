import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Badge, Card } from "@/components/ui/input";
import { excerpt, formatDateTime } from "@/lib/utils";

export default async function ApprovalsPage() {
  const session = await auth();
  const approvals = await prisma.approval.findMany({
    where: { userId: session!.user.id },
    include: { execution: { select: { publicId: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="display text-5xl">Approvals</h1>
      <div className="space-y-3">
        {approvals.length === 0 ? (
          <p className="text-muted">High-risk posts will wait here.</p>
        ) : (
          approvals.map((approval) => (
            <Card key={approval.id} className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">{approval.execution.publicId}</p>
                <Badge tone={approval.riskLevel === "HIGH" ? "bad" : "good"}>{approval.riskLevel}</Badge>
              </div>
              <p className="mt-2">{excerpt(approval.content, 160)}</p>
              <p className="mt-2 text-sm text-muted">
                {approval.riskReason} · {formatDateTime(approval.createdAt)} · {approval.status}
              </p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
