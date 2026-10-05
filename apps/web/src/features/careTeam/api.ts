import type { CareTeamMember } from "@mind-hub/shared";
import { apiFetch } from "../../api/client";

export function listCareTeam(accessToken: string) {
  return apiFetch<{ members: CareTeamMember[] }>("/care-team", { accessToken });
}
