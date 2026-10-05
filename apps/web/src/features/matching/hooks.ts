import { useMutation } from "@tanstack/react-query";
import type { SwitchTherapistRequest } from "@mind-hub/shared";
import { useAuth } from "../auth/AuthContext";
import * as api from "./api";

export function useCreateMatch() {
  const { accessToken } = useAuth();
  return useMutation({
    mutationFn: (intakeId: string) => api.createMatch(accessToken as string, intakeId),
  });
}

export function useSwitchTherapist() {
  const { accessToken } = useAuth();
  return useMutation({
    mutationFn: (input: SwitchTherapistRequest) => api.switchTherapist(accessToken as string, input),
  });
}
