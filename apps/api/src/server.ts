import "dotenv/config";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { startReleaseExpiredBookingsJob } from "./jobs/releaseExpiredBookingsJob.js";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`Mind Hub API listening on port ${env.PORT} (${env.NODE_ENV})`);
});

try {
  startReleaseExpiredBookingsJob();
} catch (err) {
  logger.warn({ err }, "Could not start release-expired-booking job (Redis unavailable?) — API will keep serving requests without it");
}
