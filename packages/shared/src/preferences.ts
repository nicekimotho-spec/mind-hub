import { z } from "zod";

export const notificationPreferencesSchema = z.object({
  smsNotificationsEnabled: z.boolean(),
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
