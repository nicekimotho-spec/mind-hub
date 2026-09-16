import { z } from "zod";
import { THERAPIST_STATUSES } from "@mind-hub/shared";

export const idParamSchema = z.object({ id: z.string().uuid() });

export const therapistStatusQuerySchema = z.object({
  status: z.enum(THERAPIST_STATUSES).optional(),
});
