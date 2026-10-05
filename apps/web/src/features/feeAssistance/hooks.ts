import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApplyForFeeAssistanceRequest, DecideFeeAssistanceRequest, FeeAssistanceStatus } from "@mind-hub/shared";
import { useAuth } from "../auth/AuthContext";
import * as api from "./api";

/** Only clients have fee assistance; for anyone else this stays idle. */
export function useMyFeeAssistance() {
  const { accessToken, user } = useAuth();
  return useQuery({
    queryKey: ["fee-assistance", "me"],
    queryFn: () => api.getMyFeeAssistance(accessToken as string),
    enabled: Boolean(accessToken) && user?.role === "CLIENT",
  });
}

export function useApplyForFeeAssistance() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyForFeeAssistanceRequest) => api.applyForFeeAssistance(accessToken as string, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fee-assistance", "me"] }),
  });
}

export function useFeeAssistanceApplications(status?: FeeAssistanceStatus) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["fee-assistance", "admin", status ?? "ALL"],
    queryFn: () => api.listApplications(accessToken as string, status),
    enabled: Boolean(accessToken),
  });
}

export function useDecideApplication() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DecideFeeAssistanceRequest }) => api.decideApplication(accessToken as string, id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["fee-assistance", "admin"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-reports-overview"] });
    },
  });
}
