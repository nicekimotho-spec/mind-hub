import { Queue, Worker } from "bullmq";
import { redisConnection } from "./redis.js";
import { logger } from "../lib/logger.js";

/**
 * Runs `task` every `everyMs` on a BullMQ repeatable job. Auxiliary infrastructure: if
 * Redis is unreachable, the caller logs a warning and the API keeps serving requests
 * rather than crashing the whole process over a background job.
 */
export function startRepeatingJob(queueName: string, everyMs: number, task: () => Promise<unknown>): { queue: Queue; worker: Worker } {
  const queue = new Queue(queueName, { connection: redisConnection });
  const worker = new Worker(
    queueName,
    async () => {
      await task();
    },
    { connection: redisConnection },
  );

  worker.on("failed", (job, err) => {
    logger.error({ err, jobId: job?.id }, `${queueName} job failed`);
  });

  void queue.add("tick", {}, { repeat: { every: everyMs }, jobId: `${queueName}-tick`, removeOnComplete: true });

  return { queue, worker };
}
