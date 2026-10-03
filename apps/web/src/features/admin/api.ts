import type { ComplaintResponse, ComplaintStatus, ReportsOverviewResponse, TherapistStatus, UpdateComplaintRequest } from "@mind-hub/shared";
import { apiFetch } from "../../api/client";
import type { TherapistCredentialRecord } from "../therapists/api";

export interface AdminTherapistRecord {
  userId: string;
  fullName: string;
  status: TherapistStatus;
  bio: string | null;
  specialties: string[];
  languages: string[];
  approach: string | null;
  feeKES: number;
  verifiedAt: string | null;
  createdAt: string;
  credentials: TherapistCredentialRecord[];
  user: { phone: string; email: string | null; phoneVerified: boolean; createdAt: string };
}

export function listTherapistsAdmin(accessToken: string, status?: TherapistStatus) {
  return apiFetch<{ therapists: AdminTherapistRecord[] }>("/admin/therapists", { accessToken, query: { status } });
}

export function verifyTherapist(accessToken: string, id: string) {
  return apiFetch<{ profile: AdminTherapistRecord }>(`/admin/therapists/${id}/verify`, { method: "POST", accessToken });
}

export function rejectTherapist(accessToken: string, id: string, reason: string) {
  return apiFetch<{ profile: AdminTherapistRecord }>(`/admin/therapists/${id}/reject`, { method: "POST", accessToken, body: { reason } });
}

export function suspendTherapist(accessToken: string, id: string, reason: string) {
  return apiFetch<{ profile: AdminTherapistRecord }>(`/admin/therapists/${id}/suspend`, { method: "POST", accessToken, body: { reason } });
}

export function listComplaintsAdmin(accessToken: string, status?: ComplaintStatus) {
  return apiFetch<{ complaints: ComplaintResponse[] }>("/admin/complaints", { accessToken, query: { status } });
}

export function updateComplaintAdmin(accessToken: string, id: string, input: UpdateComplaintRequest) {
  return apiFetch<{ complaint: ComplaintResponse }>(`/admin/complaints/${id}`, { method: "PATCH", accessToken, body: input });
}

export function getReportsOverview(accessToken: string) {
  return apiFetch<{ report: ReportsOverviewResponse }>("/admin/reports/overview", { accessToken });
}
