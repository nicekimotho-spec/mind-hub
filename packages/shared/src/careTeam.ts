import { z } from "zod";

/** The people on the other side of a client–therapist relationship: a client's
 * therapists, or a therapist's clients. A relationship exists once they have a
 * confirmed, completed or no-show booking together — booking a slot alone isn't enough,
 * so nobody can open a channel to a therapist just by holding an unpaid slot. */
export const careTeamMemberSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
});
export type CareTeamMember = z.infer<typeof careTeamMemberSchema>;
