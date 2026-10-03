import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ComplaintStatus, TherapistStatus, UpdateComplaintRequest } from "@mind-hub/shared";
import { useAuth } from "../auth/AuthContext";
import * as api from "./api";

export function useAdminTherapists(status?: TherapistStatus) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["admin-therapists", status],
    queryFn: () => api.listTherapistsAdmin(accessToken as string, status),
    enabled: Boolean(accessToken),
  });
}

function useInvalidateAdminTherapists() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["admin-therapists"] });
}

export function useVerifyTherapist() {
  const { accessToken } = useAuth();
  const invalidate = useInvalidateAdminTherapists();
  return useMutation({
    mutationFn: (id: string) => api.verifyTherapist(accessToken as string, id),
    onSuccess: invalidate,
  });
}

export function useRejectTherapist() {
  const { accessToken } = useAuth();
  const invalidate = useInvalidateAdminTherapists();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.rejectTherapist(accessToken as string, id, reason),
    onSuccess: invalidate,
  });
}

export function useSuspendTherapist() {
  const { accessToken } = useAuth();
  const invalidate = useInvalidateAdminTherapists();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.suspendTherapist(accessToken as string, id, reason),
    onSuccess: invalidate,
  });
}

export function useAdminComplaints(status?: ComplaintStatus) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["admin-complaints", status],
    queryFn: () => api.listComplaintsAdmin(accessToken as string, status),
    enabled: Boolean(accessToken),
  });
}

export function useUpdateComplaintAdmin() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateComplaintRequest }) => api.updateComplaintAdmin(accessToken as string, id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-complaints"] }),
  });
}

export function useReportsOverview() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["admin-reports-overview"],
    queryFn: () => api.getReportsOverview(accessToken as string),
    enabled: Boolean(accessToken),
  });
}
