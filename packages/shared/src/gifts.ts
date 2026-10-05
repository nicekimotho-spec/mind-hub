import { z } from "zod";
import { phoneSchema } from "./auth.js";

export const GIFT_MIN_KES = 500;
export const GIFT_MAX_KES = 50_000;
export const GIFT_VALIDITY_MONTHS = 12;
export const GIFT_AMOUNT_PRESETS = [2_500, 5_000, 10_000] as const;

/** EXPIRED is derived (an ACTIVE gift past its expiry date), not stored. */
export const GIFT_STATUSES = ["PENDING_PAYMENT", "ACTIVE", "USED_UP", "EXPIRED", "PAYMENT_FAILED"] as const;
export type GiftStatus = (typeof GIFT_STATUSES)[number];

export const purchaseGiftRequestSchema = z.object({
  amountKES: z
    .number()
    .int()
    .min(GIFT_MIN_KES, `The smallest gift is KES ${GIFT_MIN_KES.toLocaleString("en-KE")}`)
    .max(GIFT_MAX_KES, `The largest gift is KES ${GIFT_MAX_KES.toLocaleString("en-KE")}`),
  recipientName: z.string().trim().max(80).optional(),
  /** If given, the recipient is texted their code once payment goes through. */
  recipientPhone: phoneSchema.optional(),
  message: z.string().trim().max(300).optional(),
});
export type PurchaseGiftRequest = z.infer<typeof purchaseGiftRequestSchema>;

export const redeemGiftRequestSchema = z.object({
  bookingId: z.string().uuid(),
  code: z.string().trim().min(1, "Enter your gift code").max(20),
});
export type RedeemGiftRequest = z.infer<typeof redeemGiftRequestSchema>;

export const giftVoucherSchema = z.object({
  id: z.string().uuid(),
  /** Hidden until payment succeeds, so an unpaid gift's code can't be passed on. */
  code: z.string().nullable(),
  amountKES: z.number(),
  balanceKES: z.number(),
  recipientName: z.string().nullable(),
  recipientPhone: z.string().nullable(),
  message: z.string().nullable(),
  status: z.enum(GIFT_STATUSES),
  expiresAt: z.string(),
  createdAt: z.string(),
});
export type GiftVoucherResponse = z.infer<typeof giftVoucherSchema>;
