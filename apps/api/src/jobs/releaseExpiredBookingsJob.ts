import { startRepeatingJob } from "./repeatingJob.js";
import { releaseExpiredBookings } from "../modules/booking/booking.service.js";

/**
 * Starts the repeatable sweep described in BUILD_PLAN.md §7 — every minute, cancel any
 * PENDING_PAYMENT booking whose payment hold has expired and free its slot.
 */
export function startReleaseExpiredBookingsJob() {
  return startRepeatingJob("release-expired-booking", 60_000, releaseExpiredBookings);
}
