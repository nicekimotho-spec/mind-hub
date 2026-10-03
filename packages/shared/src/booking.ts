import { z } from "zod";
import { PAYMENT_STATUSES } from "./payment.js";
import { SESSION_STATUSES } from "./session.js";

export const createSlotRequestSchema = z
  .object({
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
  })
  .superRefine((data, ctx) => {
    if (data.endTime <= data.startTime) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "endTime must be after startTime", path: ["endTime"] });
    }
    if (data.startTime.getTime() <= Date.now()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "startTime must be in the future", path: ["startTime"] });
    }
  });
export type CreateSlotRequest = z.infer<typeof createSlotRequestSchema>;

export const publicSlotSchema = z.object({
  id: z.string().uuid(),
  therapistId: z.string().uuid(),
  startTime: z.string(),
  endTime: z.string(),
  isBooked: z.boolean(),
});
export type PublicSlot = z.infer<typeof publicSlotSchema>;

export const createBookingRequestSchema = z.object({
  slotId: z.string().uuid(),
});
export type CreateBookingRequest = z.infer<typeof createBookingRequestSchema>;

export const BOOKING_STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const bookingSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  therapistId: z.string().uuid(),
  slotId: z.string().uuid(),
  status: z.enum(BOOKING_STATUSES),
  createdAt: z.string(),
  expiresAt: z.string(),
});
export type BookingResponse = z.infer<typeof bookingSchema>;

/** Hydrated view used by list/detail endpoints — the raw Booking row alone isn't
 * enough to render a dashboard row (needs names, the slot time, and payment/consent
 * status), and clientId/therapistId are plain fields rather than Prisma relations
 * (see schema.prisma), so the API assembles this rather than the frontend having to. */
export const bookingDetailSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(BOOKING_STATUSES),
  createdAt: z.string(),
  expiresAt: z.string(),
  slot: z.object({
    id: z.string().uuid(),
    startTime: z.string(),
    endTime: z.string(),
  }),
  clientId: z.string().uuid(),
  clientName: z.string(),
  therapistId: z.string().uuid(),
  therapistName: z.string(),
  feeKES: z.number(),
  paymentStatus: z.enum(PAYMENT_STATUSES).nullable(),
  hasConsented: z.boolean(),
  sessionId: z.string().uuid().nullable(),
  sessionStatus: z.enum(SESSION_STATUSES).nullable(),
  hasFeedback: z.boolean(),
});
export type BookingDetail = z.infer<typeof bookingDetailSchema>;
