import type { PaymentResponse } from "@mind-hub/shared";
import { apiFetch } from "../../api/client";

export function initiatePayment(accessToken: string, bookingId: string, idempotencyKey: string) {
  return apiFetch<{ payment: PaymentResponse }>("/payments/mpesa/initiate", {
    method: "POST",
    accessToken,
    headers: { "Idempotency-Key": idempotencyKey },
    body: { bookingId },
  });
}
