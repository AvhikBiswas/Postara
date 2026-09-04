import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAdminMetrics } from "@/lib/services/admin";
import { Card } from "@/components/ui/input";
import { formatMoney, formatNumber } from "@/lib/utils";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  const metrics = await getAdminMetrics();
  const rows = [
    ["Users", formatNumber(metrics.users)],
    ["Active users", formatNumber(metrics.activeUsers)],
    ["MRR", formatMoney(metrics.mrr)],
    ["ARR", formatMoney(metrics.arr)],
    ["New users", formatNumber(metrics.newUsers)],
    ["Paid users", formatNumber(metrics.paidUsers)],
    ["Churn", `${metrics.churn}%`],
    ["Executions", formatNumber(metrics.executions)],
    ["LLM cost", formatMoney(metrics.llmCost)],
    ["Infrastructure", formatMoney(metrics.infrastructure)],
    ["Gross margin", `${metrics.grossMargin}%`],
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-muted">Admin</p>
        <h1 className="display text-5xl">Revenue</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="display mt-2 text-4xl">{value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
