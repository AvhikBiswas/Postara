import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

export type JobPayload = { executionId: string; resumeFrom?: string };

type Handler = (payload: JobPayload) => Promise<void>;

const globalQueue = globalThis as unknown as {
  postaraBullQueue?: Queue;
  postaraBullWorker?: Worker;
  postaraHandler?: Handler;
};

function redisConnection() {
  if (!process.env.REDIS_URL) return null;
  return new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
}

async function runInline(payload: JobPayload) {
  const handler = globalQueue.postaraHandler ?? (await import("./runtime")).handleExecutionJob;
  await handler(payload);
}

export async function enqueueExecution(payload: JobPayload) {
  if (globalQueue.postaraBullQueue) {
    await globalQueue.postaraBullQueue.add("execute", payload, {
      removeOnComplete: 100,
      removeOnFail: 100,
    });
    return;
  }
  if (process.env.VERCEL || process.env.QUEUE_INLINE === "true") {
    await runInline(payload);
    return;
  }
  setTimeout(() => {
    void runInline(payload).catch((error) => {
      console.error("[postara.queue]", error);
    });
  }, 0);
}

export async function startQueue(handler: Handler) {
  globalQueue.postaraHandler = handler;
  const connection = redisConnection();
  if (!connection) return;
  if (globalQueue.postaraBullQueue) return;
  globalQueue.postaraBullQueue = new Queue("postara-executions", { connection });
  globalQueue.postaraBullWorker = new Worker(
    "postara-executions",
    async (job) => handler(job.data as JobPayload),
    { connection, concurrency: 4 },
  );
  globalQueue.postaraBullWorker.on("failed", (job, error) => {
    console.error("[postara.worker]", job?.id, error);
  });
}

export async function stopQueue() {
  await globalQueue.postaraBullWorker?.close();
  await globalQueue.postaraBullQueue?.close();
}
