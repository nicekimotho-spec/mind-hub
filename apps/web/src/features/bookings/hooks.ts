import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateFeedbackRequest, SessionChannel } from "@mind-hub/shared";
import { useAuth } from "../auth/AuthContext";
import * as api from "./api";

export function useMyBookings() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => api.listMyBookings(accessToken as string),
    enabled: Boolean(accessToken),
  });
}

export function useBooking(id: string | undefined) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["booking", id],
    queryFn: () => api.getBooking(accessToken as string, id as string),
    enabled: Boolean(accessToken) && Boolean(id),
    // While a payment is in flight, poll for the M-Pesa callback landing (STK push
    // confirmation is asynchronous — see BUILD_PLAN.md M5) so the client sees their
    // booking flip to CONFIRMED without needing to manually refresh.
    refetchInterval: (query) => {
      const data = query.state.data;
      const awaitingPayment = data?.booking.status === "PENDING_PAYMENT" && data.booking.paymentStatus === "PENDING";
      return awaitingPayment ? 3000 : false;
    },
  });
}

export function useCreateBooking() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) => api.createBooking(accessToken as string, slotId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-bookings"] }),
  });
}

function useInvalidateBooking(id: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["booking", id] });
    void queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
  };
}

export function useCancelBooking(id: string) {
  const { accessToken } = useAuth();
  const invalidate = useInvalidateBooking(id);
  return useMutation({
    mutationFn: () => api.cancelBooking(accessToken as string, id),
    onSuccess: invalidate,
  });
}

export function useConsentToBooking(id: string) {
  const { accessToken } = useAuth();
  const invalidate = useInvalidateBooking(id);
  return useMutation({
    mutationFn: () => api.consentToBooking(accessToken as string, id),
    onSuccess: invalidate,
  });
}

export function useJoinSession(id: string) {
  const { accessToken } = useAuth();
  return useMutation({
    mutationFn: (channel?: SessionChannel) => api.joinSession(accessToken as string, id, channel),
  });
}

export function useSubmitFeedback(id: string) {
  const { accessToken } = useAuth();
  const invalidate = useInvalidateBooking(id);
  return useMutation({
    mutationFn: (input: CreateFeedbackRequest) => api.submitFeedback(accessToken as string, id, input),
    onSuccess: invalidate,
  });
}
