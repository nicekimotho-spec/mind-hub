import type { GiftVoucherResponse, PaymentResponse, PurchaseGiftRequest } from "@mind-hub/shared";
import { apiFetch } from "../../api/client";

export function listMyGifts(accessToken: string) {
  return apiFetch<{ gifts: GiftVoucherResponse[] }>("/gifts/mine", { accessToken });
}

export function purchaseGift(accessToken: string, input: PurchaseGiftRequest, idempotencyKey: string) {
  return apiFetch<{ gift: GiftVoucherResponse }>("/gifts", {
    method: "POST",
    accessToken,
    headers: { "Idempotency-Key": idempotencyKey },
    body: input,
  });
}

export function redeemGift(accessToken: string, bookingId: string, code: string) {
  return apiFetch<{ payment: PaymentResponse; remainingBalanceKES: number }>("/gifts/redeem", {
    method: "POST",
    accessToken,
    body: { bookingId, code },
  });
}
