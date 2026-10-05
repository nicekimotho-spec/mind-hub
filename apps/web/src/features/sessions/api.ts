import type { SendMessageResponse, SessionChat, SessionOutcome } from "@mind-hub/shared";
import { apiFetch } from "../../api/client";

export interface SessionRecord {
  id: string;
  bookingId: string;
  channel: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
}

export function completeSession(accessToken: string, sessionId: string, outcome: SessionOutcome) {
  return apiFetch<{ session: SessionRecord }>(`/sessions/${sessionId}/complete`, {
    method: "POST",
    accessToken,
    body: { outcome },
  });
}

export function getSessionChat(accessToken: string, sessionId: string) {
  return apiFetch<SessionChat>(`/sessions/${sessionId}/messages`, { accessToken });
}

export function sendSessionChatMessage(accessToken: string, sessionId: string, body: string) {
  return apiFetch<SendMessageResponse>(`/sessions/${sessionId}/messages`, { method: "POST", accessToken, body: { body } });
}
