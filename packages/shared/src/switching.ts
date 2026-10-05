import { z } from "zod";
import { publicTherapistSchema } from "./therapists.js";

export const SWITCH_REASONS = [
  "NOT_A_GOOD_FIT",
  "APPROACH",
  "AVAILABILITY",
  "COST",
  "LANGUAGE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
] as const;
export type SwitchReason = (typeof SWITCH_REASONS)[number];

export const switchTherapistRequestSchema = z.object({
  fromTherapistId: z.string().uuid(),
  reason: z.enum(SWITCH_REASONS),
  comment: z.string().trim().max(1000).optional(),
});
export type SwitchTherapistRequest = z.infer<typeof switchTherapistRequestSchema>;

export const switchTherapistResponseSchema = z.object({
  switchId: z.string().uuid(),
  therapists: z.array(publicTherapistSchema).max(5),
});
export type SwitchTherapistResponse = z.infer<typeof switchTherapistResponseSchema>;
