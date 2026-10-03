import type { SessionOutcome } from "@mind-hub/shared";
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
