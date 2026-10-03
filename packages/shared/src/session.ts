import { z } from "zod";

export const SESSION_CHANNELS = ["VIDEO", "AUDIO"] as const;
export type SessionChannel = (typeof SESSION_CHANNELS)[number];

export const SESSION_STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "TECH_FAILURE"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const joinSessionRequestSchema = z.object({
  channel: z.enum(SESSION_CHANNELS).optional(),
});
export type JoinSessionRequest = z.infer<typeof joinSessionRequestSchema>;

export const joinSessionResponseSchema = z.object({
  sessionId: z.string().uuid(),
  channel: z.enum(SESSION_CHANNELS),
  roomToken: z.string(),
});
export type JoinSessionResponse = z.infer<typeof joinSessionResponseSchema>;

export const SESSION_OUTCOMES = ["COMPLETED", "NO_SHOW"] as const;
export type SessionOutcome = (typeof SESSION_OUTCOMES)[number];

export const completeSessionRequestSchema = z.object({
  outcome: z.enum(SESSION_OUTCOMES),
});
export type CompleteSessionRequest = z.infer<typeof completeSessionRequestSchema>;
