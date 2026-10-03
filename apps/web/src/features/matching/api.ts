import type { MatchResultResponse } from "@mind-hub/shared";
import { apiFetch } from "../../api/client";

export function createMatch(accessToken: string, intakeId: string) {
  return apiFetch<{ match: MatchResultResponse }>(`/matching/${intakeId}`, { method: "POST", accessToken });
}
