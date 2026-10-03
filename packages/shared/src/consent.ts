import { z } from "zod";

export const consentVersionSchema = z.object({
  id: z.string().uuid(),
  version: z.number(),
  content: z.string(),
  effectiveAt: z.string(),
});
export type ConsentVersionResponse = z.infer<typeof consentVersionSchema>;

export const consentRecordSchema = z.object({
  id: z.string().uuid(),
  bookingId: z.string().uuid(),
  consentVersionId: z.string().uuid(),
  acceptedAt: z.string(),
});
export type ConsentRecordResponse = z.infer<typeof consentRecordSchema>;
