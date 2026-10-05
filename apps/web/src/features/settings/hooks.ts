import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationPreferences } from "@mind-hub/shared";
import { useAuth } from "../auth/AuthContext";
import * as api from "./api";

export function usePreferences() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["preferences"],
    queryFn: () => api.getPreferences(accessToken as string),
    enabled: Boolean(accessToken),
  });
}

export function useUpdatePreferences() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NotificationPreferences) => api.updatePreferences(accessToken as string, input),
    onSuccess: (data) => queryClient.setQueryData(["preferences"], data),
  });
}
