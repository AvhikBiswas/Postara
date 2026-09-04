import { subscribeExecution } from "@/lib/engine/prisma-store";
import { requireSession } from "@/lib/api";
import { assertExecutionAccess } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession(request);
  const { id } = await params;
  const execution = await assertExecutionAccess(user.id, id, user.role);
  if (!execution) {
    return new Response("Not found", { status: 404 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };
      send({ type: "hello", executionId: execution.id });
      const unsubscribe = subscribeExecution(execution.id, send);
      const heartbeat = setInterval(() => send({ type: "ping" }), 15_000);
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
