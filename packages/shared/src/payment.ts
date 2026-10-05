import { z } from "zod";

export const PAYMENT_PROVIDERS = ["MPESA", "CARD", "GIFT"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_STATUSES = ["INITIATED", "PENDING", "SUCCEEDED", "FAILED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const initiatePaymentRequestSchema = z.object({
  bookingId: z.string().uuid(),
});
export type InitiatePaymentRequest = z.infer<typeof initiatePaymentRequestSchema>;

export const paymentSchema = z.object({
  id: z.string().uuid(),
  bookingId: z.string().uuid(),
  provider: z.enum(PAYMENT_PROVIDERS),
  amountKES: z.number(),
  status: z.enum(PAYMENT_STATUSES),
  createdAt: z.string(),
});
export type PaymentResponse = z.infer<typeof paymentSchema>;
