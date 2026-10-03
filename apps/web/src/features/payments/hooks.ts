import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import * as api from "./api";

export function useInitiatePayment(bookingId: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    // A fresh Idempotency-Key per click represents a new payment *attempt* — the API
    // still guards against a true double-submit race server-side (BUILD_PLAN.md §8.2).
    mutationFn: () => api.initiatePayment(accessToken as string, bookingId, crypto.randomUUID()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["booking", bookingId] }),
  });
}
