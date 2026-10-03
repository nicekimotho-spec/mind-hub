import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateComplaintRequest } from "@mind-hub/shared";
import { useAuth } from "../auth/AuthContext";
import * as api from "./api";

export function useMyComplaints() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["my-complaints"],
    queryFn: () => api.listMyComplaints(accessToken as string),
    enabled: Boolean(accessToken),
  });
}

export function useCreateComplaint() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateComplaintRequest) => api.createComplaint(accessToken as string, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-complaints"] }),
  });
}
