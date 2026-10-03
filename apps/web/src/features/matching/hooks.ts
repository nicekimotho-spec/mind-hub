import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import * as api from "./api";

export function useCreateMatch() {
  const { accessToken } = useAuth();
  return useMutation({
    mutationFn: (intakeId: string) => api.createMatch(accessToken as string, intakeId),
  });
}
