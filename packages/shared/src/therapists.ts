import { z } from "zod";

export const CREDENTIAL_TYPES = [
  "ACADEMIC_CERTIFICATE",
  "PROFESSIONAL_LICENSE",
  "GOVERNMENT_ID",
  "CV",
  "PROFESSIONAL_INDEMNITY",
  "REFERENCE_LETTER",
] as const;
export type CredentialType = (typeof CREDENTIAL_TYPES)[number];

export const THERAPIST_STATUSES = ["PENDING_VERIFICATION", "VERIFIED", "ACTIVE", "REJECTED", "SUSPENDED"] as const;
export type TherapistStatus = (typeof THERAPIST_STATUSES)[number];

/**
 * The therapist submits their full editable profile in one request (rather than
 * incremental PATCH semantics) — this keeps "what does the client see right now"
 * unambiguous and matches the "complete your profile" UX this maps to.
 */
export const updateTherapistProfileSchema = z
  .object({
  bio: z.string().trim().min(1).max(2000).optional(),
  specialties: z.array(z.string().trim().min(1).max(80)).min(1, "Select at least one specialty").max(20),
  languages: z.array(z.string().trim().min(1).max(40)).min(1, "Select at least one language").max(10),
  approach: z.string().trim().max(500).optional(),
  feeKES: z.number().int().positive().max(1_000_000),
  photoUrl: z.string().trim().url("Enter a full link starting with https://").max(2000).optional(),
  yearsExperience: z.number().int().min(0).max(60).optional(),
  registrationNumber: z.string().trim().max(60).optional(),
  /** Offered to clients approved for fee assistance (feeAssistance.ts). */
  reducedFeeKES: z.number().int().positive().max(1_000_000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.reducedFeeKES !== undefined && data.reducedFeeKES >= data.feeKES) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "The reduced fee must be lower than your standard fee", path: ["reducedFeeKES"] });
    }
  });
export type UpdateTherapistProfileRequest = z.infer<typeof updateTherapistProfileSchema>;

export const addCredentialRequestSchema = z.object({
  type: z.enum(CREDENTIAL_TYPES),
  documentUrl: z.string().url().max(2000),
});
export type AddCredentialRequest = z.infer<typeof addCredentialRequestSchema>;

export const rejectOrSuspendRequestSchema = z.object({
  reason: z.string().trim().min(3, "Provide a reason (min 3 characters)").max(1000),
});
export type RejectOrSuspendRequest = z.infer<typeof rejectOrSuspendRequestSchema>;

/**
 * Ratings are shown only as an average, and only once a therapist has at least this
 * many — below that, one client's rating could be singled out, and a single early
 * rating would swing the number too much to mean anything.
 */
export const MIN_RATINGS_TO_DISPLAY = 5;

export const therapistRatingSchema = z.object({
  average: z.number(),
  count: z.number().int(),
});
export type TherapistRating = z.infer<typeof therapistRatingSchema>;

export const publicTherapistSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string(),
  bio: z.string().nullable(),
  specialties: z.array(z.string()),
  languages: z.array(z.string()),
  approach: z.string().nullable(),
  feeKES: z.number(),
  photoUrl: z.string().nullable(),
  yearsExperience: z.number().nullable(),
  registrationNumber: z.string().nullable(),
  verifiedAt: z.string().nullable(),
  reducedFeeKES: z.number().nullable(),
  /** Null until the therapist has MIN_RATINGS_TO_DISPLAY ratings. */
  rating: therapistRatingSchema.nullable(),
});
export type PublicTherapist = z.infer<typeof publicTherapistSchema>;

export const therapistDirectoryQuerySchema = z.object({
  specialty: z.string().trim().min(1).max(80).optional(),
  language: z.string().trim().min(1).max(40).optional(),
  // A query-string flag: present as "true" to list only therapists offering reduced fees.
  reducedFee: z.enum(["true"]).optional(),
});
export type TherapistDirectoryQuery = z.infer<typeof therapistDirectoryQuerySchema>;
