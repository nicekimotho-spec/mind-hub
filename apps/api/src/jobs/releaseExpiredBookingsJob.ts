import { Queue, Worker } from "bullmq";
import { redisConnection } from "./redis.js";
import { releaseExpiredBookings } from "../modules/booking/booking.service.js";
import { logger } from "../lib/logger.js";

const QUEUE_NAME = "release-expired-booking";
const TICK_INTERVAL_MS = 60_000;

/**
 * Starts the repeatable sweep described in BUILD_PLAN.md §7 — every minute, cancel any
 * PENDING_PAYMENT booking whose payment hold has expired and free its slot. Auxiliary
 * infrastructure: if Redis is unreachable, this logs a warning and the API keeps
 * serving requests rather than crashing the whole process over a background job.
 */
export function startReleaseExpiredBookingsJob(): { queue: Queue; worker: Worker } {
  const queue = new Queue(QUEUE_NAME, { connection: redisConnection });
  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      await releaseExpiredBookings();
    },
    { connection: redisConnection },
  );

  worker.on("failed", (job, err) => {
    logger.error({ err, jobId: job?.id }, "release-expired-booking job failed");
  });

  void queue.add(
    "tick",
    {},
    { repeat: { every: TICK_INTERVAL_MS }, jobId: "release-expired-booking-tick", removeOnComplete: true },
  );

  return { queue, worker };
}
