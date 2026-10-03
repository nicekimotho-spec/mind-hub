import type { IntakeRequest, IntakeResult } from "@mind-hub/shared";
import { apiFetch } from "../../api/client";

export function createIntake(accessToken: string, input: IntakeRequest) {
  return apiFetch<{ intake: IntakeResult }>("/intake", { method: "POST", accessToken, body: input });
}

export function getIntake(accessToken: string, id: string) {
  return apiFetch<{ intake: IntakeResult }>(`/intake/${id}`, { accessToken });
}
