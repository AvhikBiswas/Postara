import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, Badge } from "@/components/ui/input";
import { excerpt, formatDateTime } from "@/lib/utils";
import type { WorkflowDefinition } from "@/lib/engine/types";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [postsToday, scheduled, awaiting, successful, failed, upcoming, recent] = await Promise.all([
    prisma.post.count({ where: { userId, createdAt: { gte: start } } }),
    prisma.workflow.count({ where: { userId, status: "active" } }),
    prisma.approval.count({ where: { userId, status: "pending" } }),
    prisma.execution.count({ where: { userId, status: "SUCCESS" } }),
    prisma.execution.count({ where: { userId, status: "FAILED" } }),
    prisma.workflow.findMany({
      where: { userId, nextRunAt: { not: null } },
      orderBy: { nextRunAt: "asc" },
      take: 6,
    }),
    prisma.post.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 4 }),
  ]);

  const stats = [
    ["Posts today", postsToday],
    ["Scheduled", scheduled],
    ["Awaiting approval", awaiting],
    ["Successful", successful],
    ["Failed", failed],
  ] as const;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-muted">Dashboard</p>
        <h1 className="display mt-2 text-5xl">Good to see you, {session!.user.name?.split(" ")[0]}.</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="display mt-2 text-4xl">{value}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="display text-3xl">Upcoming</h2>
          <div className="mt-4 space-y-4">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted">Nothing scheduled yet. Start Autopilot to create the first run.</p>
            ) : (
              upcoming.map((item) => {
                const definition = JSON.parse(item.definition) as WorkflowDefinition;
                const topics = definition.steps.find((step) => step.type === "research")?.config?.topics;
                return (
                  <div key={item.id} className="flex items-start justify-between gap-4 border-b border-line/70 pb-4 last:border-0">
                    <div>
                      <p className="text-sm text-muted">{formatDateTime(item.nextRunAt)}</p>
                      <p className="mt-1 font-medium">{excerpt(String(topics || item.name), 48)}</p>
                    </div>
                    <Badge>{item.status}</Badge>
                  </div>
                );
              })
            )}
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="display text-3xl">Recent posts</h2>
            <Link href="/autopilot" className="text-sm underline">
              Open Autopilot
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {recent.length === 0 ? (
              <p className="text-sm text-muted">Published posts will land here.</p>
            ) : (
              recent.map((post) => (
                <div key={post.id}>
                  <p className="text-sm text-muted">{formatDateTime(post.publishedAt ?? post.createdAt)}</p>
                  <p className="mt-1">{excerpt(post.content, 110)}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
