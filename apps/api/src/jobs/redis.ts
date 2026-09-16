import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

// BullMQ requires this exact option on its Redis connections.
export const redisConnection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

// ioredis connection failures are emitted as async "error" events, not thrown
// exceptions — without a listener, Node treats an unhandled one as fatal and crashes
// the process. Logging it here keeps the API serving HTTP requests even if the
// background job infrastructure (Redis) is unavailable.
redisConnection.on("error", (err: Error) => {
  logger.warn({ err }, "Redis connection error (background jobs degraded)");
});
