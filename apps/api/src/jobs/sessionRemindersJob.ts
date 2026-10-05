import { startRepeatingJob } from "./repeatingJob.js";
import { sendDueSessionReminders } from "../modules/notifications/reminders.service.js";

/** Every minute, sends any session reminder SMS that has come due (reminders.service.ts). */
export function startSessionRemindersJob() {
  return startRepeatingJob("session-reminders", 60_000, () => sendDueSessionReminders());
}
