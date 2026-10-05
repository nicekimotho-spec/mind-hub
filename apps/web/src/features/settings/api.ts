import type { NotificationPreferences } from "@mind-hub/shared";
import { apiFetch } from "../../api/client";

export function getPreferences(accessToken: string) {
  return apiFetch<{ preferences: NotificationPreferences }>("/users/me/preferences", { accessToken });
}

export function updatePreferences(accessToken: string, input: NotificationPreferences) {
  return apiFetch<{ preferences: NotificationPreferences }>("/users/me/preferences", { method: "PATCH", accessToken, body: input });
}
