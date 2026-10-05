import type { MatchResultResponse, SwitchTherapistRequest, SwitchTherapistResponse } from "@mind-hub/shared";
import { apiFetch } from "../../api/client";

export function createMatch(accessToken: string, intakeId: string) {
  return apiFetch<{ match: MatchResultResponse }>(`/matching/${intakeId}`, { method: "POST", accessToken });
}

export function switchTherapist(accessToken: string, input: SwitchTherapistRequest) {
  return apiFetch<SwitchTherapistResponse>("/matching/switch", { method: "POST", accessToken, body: input });
}
