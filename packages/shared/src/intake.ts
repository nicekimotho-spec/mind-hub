import { z } from "zod";

export const INTAKE_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
export const INTAKE_TIMES_OF_DAY = ["MORNING", "AFTERNOON", "EVENING"] as const;
export const COMMUNICATION_METHODS = ["VIDEO", "AUDIO", "CHAT"] as const;

export const CONCERN_TAGS = [
  "Individual counselling",
  "Couples and family counselling",
  "Youth/young-adult support",
  "Stress and anxiety management",
  "Relationship and family concerns",
  "Grief and life transitions",
  "Workplace wellbeing",
  "Parenting support",
  "Personal development and emotional wellbeing",
] as const;
export type ConcernTag = (typeof CONCERN_TAGS)[number];

export const intakeAvailabilitySchema = z.object({
  days: z.array(z.enum(INTAKE_DAYS)).min(1, "Select at least one day"),
  timesOfDay: z.array(z.enum(INTAKE_TIMES_OF_DAY)).min(1, "Select at least one time of day"),
});
export type IntakeAvailability = z.infer<typeof intakeAvailabilitySchema>;

/**
 * A minimal, deliberately placeholder safety screen — NOT a clinically validated
 * instrument. Per PRD.md (FR-SAF-05) and BUILD_PLAN.md §10 M8, the real safeguarding/
 * crisis workflow must be authored and signed off by qualified clinical and legal
 * professionals before any real client relies on it. This exists so the booking-gate
 * mechanics (BUILD_PLAN.md §8.3) can be built and tested now; the actual questions and
 * risk thresholds are a later replacement, not a finished clinical tool.
 */
export const safetyScreeningAnswersSchema = z.object({
  hasThoughtsOfSelfHarm: z.boolean(),
  hasPlanOrIntent: z.boolean(),
  hasAccessToMeans: z.boolean(),
  isInImmediateDanger: z.boolean(),
});
export type SafetyScreeningAnswers = z.infer<typeof safetyScreeningAnswersSchema>;

export const intakeRequestSchema = z.object({
  presentingConcern: z.string().trim().min(1).max(2000),
  concernTags: z.array(z.enum(CONCERN_TAGS)).min(1, "Select at least one concern").max(5),
  preferredApproach: z.string().trim().max(200).optional(),
  preferredCommunicationMethod: z.enum(COMMUNICATION_METHODS).optional(),
  previousCounsellingExperience: z.boolean().optional(),
  availability: intakeAvailabilitySchema,
  safetyAnswers: safetyScreeningAnswersSchema,
});
export type IntakeRequest = z.infer<typeof intakeRequestSchema>;

export const RISK_LEVELS = ["NONE", "LOW", "ELEVATED", "CRITICAL"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const intakeResultSchema = z.object({
  id: z.string().uuid(),
  riskLevel: z.enum(RISK_LEVELS),
  blockedBooking: z.boolean(),
  createdAt: z.string(),
});
export type IntakeResult = z.infer<typeof intakeResultSchema>;
