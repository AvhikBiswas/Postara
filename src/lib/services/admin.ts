import { prisma } from "@/lib/db";

export async function getAdminMetrics() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    users,
    newUsers,
    paidUsers,
    prevPaidUsers,
    executions,
    postsToday,
    llmAgg,
    failed,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.user.count({ where: { plan: { in: ["pro", "team"] } } }),
    prisma.user.count({
      where: { plan: { in: ["pro", "team"] }, createdAt: { lt: monthStart, gte: prevMonthStart } },
    }),
    prisma.execution.count(),
    prisma.post.count({
      where: {
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
      },
    }),
    prisma.executionNode.aggregate({ _sum: { costUsd: true } }),
    prisma.execution.count({ where: { status: "FAILED" } }),
  ]);

  const mrr = (await prisma.user.count({ where: { plan: "pro" } })) * 29
    + (await prisma.user.count({ where: { plan: "team" } })) * 79;
  const arr = mrr * 12;
  const churn = paidUsers === 0 ? 0 : Math.max(0, ((prevPaidUsers - paidUsers) / Math.max(prevPaidUsers, 1)) * 100);
  const llmCost = llmAgg._sum.costUsd ?? 0;
  const infrastructure = Math.max(40, users * 0.18);
  const gross = mrr === 0 ? 0 : ((mrr - llmCost - infrastructure) / mrr) * 100;

  return {
    users,
    activeUsers: await prisma.execution.groupBy({ by: ["userId"] }).then((rows) => rows.length),
    mrr,
    arr,
    newUsers,
    paidUsers,
    churn: Number(churn.toFixed(1)),
    executions,
    postsToday,
    failed,
    llmCost,
    infrastructure,
    grossMargin: Number(Math.max(0, gross).toFixed(0)),
  };
}
