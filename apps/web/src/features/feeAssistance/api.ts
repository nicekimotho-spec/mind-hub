import type {
  AdminFeeAssistanceApplication,
  ApplyForFeeAssistanceRequest,
  DecideFeeAssistanceRequest,
  FeeAssistanceApplicationResponse,
  FeeAssistanceStatus,
  MyFeeAssistanceResponse,
} from "@mind-hub/shared";
import { apiFetch } from "../../api/client";

export function getMyFeeAssistance(accessToken: string) {
  return apiFetch<MyFeeAssistanceResponse>("/fee-assistance/me", { accessToken });
}

export function applyForFeeAssistance(accessToken: string, input: ApplyForFeeAssistanceRequest) {
  return apiFetch<{ application: FeeAssistanceApplicationResponse }>("/fee-assistance", { method: "POST", accessToken, body: input });
}

export function listApplications(accessToken: string, status?: FeeAssistanceStatus) {
  return apiFetch<{ applications: AdminFeeAssistanceApplication[] }>("/admin/fee-assistance", { accessToken, query: { status } });
}

export function decideApplication(accessToken: string, id: string, input: DecideFeeAssistanceRequest) {
  return apiFetch<{ application: FeeAssistanceApplicationResponse }>(`/admin/fee-assistance/${id}/decision`, {
    method: "POST",
    accessToken,
    body: input,
  });
}
