import { z } from "zod";
import { publicTherapistSchema } from "./therapists.js";

export const matchResultSchema = z.object({
  id: z.string().uuid(),
  intakeId: z.string().uuid(),
  therapists: z.array(publicTherapistSchema).max(5),
  createdAt: z.string(),
});
export type MatchResultResponse = z.infer<typeof matchResultSchema>;
