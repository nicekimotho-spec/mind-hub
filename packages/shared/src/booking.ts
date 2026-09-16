import { z } from "zod";

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
