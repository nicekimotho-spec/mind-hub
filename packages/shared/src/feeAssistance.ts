import { z } from "zod";

/**
 * Reduced fees, PRD §16's cross-subsidy model in its simplest form: a therapist opts in
 * by setting a lower fee, a client applies once, and an admin approves them for a fixed
 * period. Approved clients then pay the reduced fee with any therapist who offers one.
 */
export const FEE_ASSISTANCE_APPROVAL_MONTHS = 6;

export const INCOME_BANDS = ["NO_INCOME", "UNDER_10K", "10K_TO_30K", "30K_TO_60K", "60K_TO_100K", "OVER_100K"] as const;
export type IncomeBand = (typeof INCOME_BANDS)[number];

export const FEE_ASSISTANCE_STATUSES = ["PENDING", "APPROVED", "DECLINED"] as const;
export type FeeAssistanceStatus = (typeof FEE_ASSISTANCE_STATUSES)[number];

export const applyForFeeAssistanceRequestSchema = z.object({
  incomeBand: z.enum(INCOME_BANDS),
  householdSize: z.number().int().min(1).max(30).optional(),
  reason: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(1000),
});
export type ApplyForFeeAssistanceRequest = z.infer<typeof applyForFeeAssistanceRequestSchema>;

export const decideFeeAssistanceRequestSchema = z.object({
  decision: z.enum(["APPROVED", "DECLINED"]),
  note: z.string().trim().max(500).optional(),
});
export type DecideFeeAssistanceRequest = z.infer<typeof decideFeeAssistanceRequestSchema>;

export const feeAssistanceApplicationSchema = z.object({
  id: z.string().uuid(),
  incomeBand: z.enum(INCOME_BANDS),
  householdSize: z.number().nullable(),
  reason: z.string(),
  status: z.enum(FEE_ASSISTANCE_STATUSES),
  reviewNote: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
});
export type FeeAssistanceApplicationResponse = z.infer<typeof feeAssistanceApplicationSchema>;

export const myFeeAssistanceSchema = z.object({
  /** The most recent application, if any. */
  application: feeAssistanceApplicationSchema.nullable(),
  /** True while an approval is in force. */
  isEligible: z.boolean(),
});
export type MyFeeAssistanceResponse = z.infer<typeof myFeeAssistanceSchema>;

export const adminFeeAssistanceApplicationSchema = feeAssistanceApplicationSchema.extend({
  clientId: z.string().uuid(),
  clientName: z.string(),
});
export type AdminFeeAssistanceApplication = z.infer<typeof adminFeeAssistanceApplicationSchema>;
