import "dotenv/config";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { startReleaseExpiredBookingsJob } from "./jobs/releaseExpiredBookingsJob.js";
import { startSessionRemindersJob } from "./jobs/sessionRemindersJob.js";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`Mind Hub API listening on port ${env.PORT} (${env.NODE_ENV})`);
});

for (const [name, start] of [
  ["release-expired-booking", startReleaseExpiredBookingsJob],
  ["session-reminders", startSessionRemindersJob],
] as const) {
  try {
    start();
  } catch (err) {
    logger.warn({ err }, `Could not start ${name} job (Redis unavailable?) — API will keep serving requests without it`);
  }
}
