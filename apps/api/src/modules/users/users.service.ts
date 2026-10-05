import type { NotificationPreferences } from "@mind-hub/shared";
import { prisma } from "../../lib/db.js";

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { smsNotificationsEnabled: true } });
  return { smsNotificationsEnabled: user.smsNotificationsEnabled };
}

export async function updateNotificationPreferences(userId: string, input: NotificationPreferences): Promise<NotificationPreferences> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { smsNotificationsEnabled: input.smsNotificationsEnabled },
    select: { smsNotificationsEnabled: true },
  });
  return { smsNotificationsEnabled: user.smsNotificationsEnabled };
}
