import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireSession } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const user = await requireSession(request);
    const executions = await prisma.execution.findMany({
      where: { userId: user.id },
      include: { workflow: { select: { name: true } }, nodes: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    return NextResponse.json(executions);
  } catch (error) {
    return jsonError(error);
  }
}
