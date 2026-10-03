import { useMutation } from "@tanstack/react-query";
import type { IntakeRequest } from "@mind-hub/shared";
import { useAuth } from "../auth/AuthContext";
import * as api from "./api";

export function useCreateIntake() {
  const { accessToken } = useAuth();
  return useMutation({
    mutationFn: (input: IntakeRequest) => api.createIntake(accessToken as string, input),
  });
}
