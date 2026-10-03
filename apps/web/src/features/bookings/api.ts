import type {
  BookingDetail,
  BookingResponse,
  ConsentRecordResponse,
  CreateFeedbackRequest,
  FeedbackResponse,
  JoinSessionResponse,
  SessionChannel,
} from "@mind-hub/shared";
import { apiFetch } from "../../api/client";

export function listMyBookings(accessToken: string) {
  return apiFetch<{ bookings: BookingDetail[] }>("/bookings", { accessToken });
}

export function getBooking(accessToken: string, id: string) {
  return apiFetch<{ booking: BookingDetail }>(`/bookings/${id}`, { accessToken });
}

export function createBooking(accessToken: string, slotId: string) {
  return apiFetch<{ booking: BookingResponse }>("/bookings", { method: "POST", accessToken, body: { slotId } });
}

export function cancelBooking(accessToken: string, id: string) {
  return apiFetch<{ booking: BookingResponse }>(`/bookings/${id}/cancel`, { method: "POST", accessToken });
}

export function consentToBooking(accessToken: string, id: string) {
  return apiFetch<{ consent: ConsentRecordResponse }>(`/bookings/${id}/consent`, { method: "POST", accessToken });
}

export function joinSession(accessToken: string, id: string, channel?: SessionChannel) {
  return apiFetch<JoinSessionResponse>(`/bookings/${id}/session/join-token`, {
    method: "POST",
    accessToken,
    body: { channel },
  });
}

export function submitFeedback(accessToken: string, id: string, input: CreateFeedbackRequest) {
  return apiFetch<{ feedback: FeedbackResponse }>(`/bookings/${id}/feedback`, { method: "POST", accessToken, body: input });
}
