import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireSession } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const user = await requireSession(request);
    const approvals = await prisma.approval.findMany({
      where: { userId: user.id },
      include: { execution: { select: { publicId: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    return NextResponse.json(approvals);
  } catch (error) {
    return jsonError(error);
  }
}
