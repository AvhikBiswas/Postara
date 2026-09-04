import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireSession } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const user = await requireSession(request);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const [postsToday, scheduled, awaiting, successful, failed, upcoming, recent] = await Promise.all([
      prisma.post.count({ where: { userId: user.id, createdAt: { gte: start } } }),
      prisma.workflow.count({ where: { userId: user.id, status: "active" } }),
      prisma.approval.count({ where: { userId: user.id, status: "pending" } }),
      prisma.execution.count({ where: { userId: user.id, status: "SUCCESS" } }),
      prisma.execution.count({ where: { userId: user.id, status: "FAILED" } }),
      prisma.workflow.findMany({
        where: { userId: user.id, status: "active", nextRunAt: { not: null } },
        orderBy: { nextRunAt: "asc" },
        take: 5,
      }),
      prisma.post.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      stats: { postsToday, scheduled, awaiting, successful, failed },
      upcoming: upcoming.map((item) => ({
        id: item.id,
        name: item.name,
        at: item.nextRunAt,
        preview: item.description || item.name,
      })),
      recent,
    });
  } catch (error) {
    return jsonError(error);
  }
}
