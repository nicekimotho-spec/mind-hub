import { z } from "zod";

/**
 * Shape returned by the API for every non-2xx response, so the frontend has a single
 * predictable error contract instead of parsing framework-specific error bodies.
 */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
