import type { ComplaintResponse, CreateComplaintRequest } from "@mind-hub/shared";
import { apiFetch } from "../../api/client";

export function createComplaint(accessToken: string, input: CreateComplaintRequest) {
  return apiFetch<{ complaint: ComplaintResponse }>("/complaints", { method: "POST", accessToken, body: input });
}

export function listMyComplaints(accessToken: string) {
  return apiFetch<{ complaints: ComplaintResponse[] }>("/complaints", { accessToken });
}
