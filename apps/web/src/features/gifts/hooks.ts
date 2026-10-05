import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PurchaseGiftRequest } from "@mind-hub/shared";
import { useAuth } from "../auth/AuthContext";
import * as api from "./api";

export function useMyGifts() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["my-gifts"],
    queryFn: () => api.listMyGifts(accessToken as string),
    enabled: Boolean(accessToken),
    // Poll while an M-Pesa prompt is outstanding, so the code appears once it's paid.
    refetchInterval: (query) => (query.state.data?.gifts.some((g) => g.status === "PENDING_PAYMENT") ? 3000 : false),
  });
}

/** The caller supplies the Idempotency-Key and keeps it for the whole attempt, so a
 * double-tap can't buy two gifts (see GiftsPage). */
export function usePurchaseGift() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: PurchaseGiftRequest; idempotencyKey: string }) =>
      api.purchaseGift(accessToken as string, input, idempotencyKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-gifts"] }),
  });
}

export function useRedeemGift(bookingId: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.redeemGift(accessToken as string, bookingId, code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      void queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
  });
}
