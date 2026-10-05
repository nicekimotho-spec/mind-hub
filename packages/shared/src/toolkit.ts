import { z } from "zod";
import { WORKSHEET_SLUGS } from "./worksheets.js";

/**
 * Journal entries, goals and worksheets belong to the client and are private by default.
 * Each one can be shared with a single therapist from the client's care team, so the
 * client decides exactly what each therapist sees. Null means "only me".
 */
const shareTargetSchema = z.string().uuid().nullable().optional();

export const MOOD_LEVELS = [1, 2, 3, 4, 5] as const;

export const journalEntryRequestSchema = z.object({
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(1, "Write something first").max(10_000),
  mood: z.number().int().min(1).max(5).optional(),
  sharedWithTherapistId: shareTargetSchema,
});
export type JournalEntryRequest = z.infer<typeof journalEntryRequestSchema>;

export const journalEntrySchema = z.object({
  id: z.string().uuid(),
  title: z.string().nullable(),
  body: z.string(),
  mood: z.number().nullable(),
  sharedWithTherapistId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type JournalEntryResponse = z.infer<typeof journalEntrySchema>;

export const GOAL_STATUSES = ["ACTIVE", "ACHIEVED", "ARCHIVED"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const createGoalRequestSchema = z.object({
  title: z.string().trim().min(1, "Give your goal a name").max(200),
  description: z.string().trim().max(1000).optional(),
  sharedWithTherapistId: shareTargetSchema,
});
export type CreateGoalRequest = z.infer<typeof createGoalRequestSchema>;

/** Partial: progress and status change one at a time from the goals list. */
export const updateGoalRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    status: z.enum(GOAL_STATUSES).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    sharedWithTherapistId: shareTargetSchema,
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), { message: "Nothing to update" });
export type UpdateGoalRequest = z.infer<typeof updateGoalRequestSchema>;

export const goalSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(GOAL_STATUSES),
  progress: z.number(),
  sharedWithTherapistId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type GoalResponse = z.infer<typeof goalSchema>;

export const WORKSHEET_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const;
export type WorksheetStatus = (typeof WORKSHEET_STATUSES)[number];

const worksheetAnswersSchema = z.record(z.string().max(60), z.union([z.string().max(4000), z.number()]));

export const startWorksheetRequestSchema = z.object({
  worksheetSlug: z.enum(WORKSHEET_SLUGS),
});
export type StartWorksheetRequest = z.infer<typeof startWorksheetRequestSchema>;

export const updateWorksheetRequestSchema = z
  .object({
    answers: worksheetAnswersSchema.optional(),
    status: z.enum(["IN_PROGRESS", "COMPLETED"]).optional(),
    sharedWithTherapistId: shareTargetSchema,
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), { message: "Nothing to update" });
export type UpdateWorksheetRequest = z.infer<typeof updateWorksheetRequestSchema>;

export const assignWorksheetRequestSchema = z.object({
  clientId: z.string().uuid(),
  worksheetSlug: z.enum(WORKSHEET_SLUGS),
  note: z.string().trim().max(500).optional(),
});
export type AssignWorksheetRequest = z.infer<typeof assignWorksheetRequestSchema>;

export const worksheetResponseSchema = z.object({
  id: z.string().uuid(),
  worksheetSlug: z.string(),
  assignedById: z.string().uuid().nullable(),
  assignedByName: z.string().nullable(),
  assignmentNote: z.string().nullable(),
  status: z.enum(WORKSHEET_STATUSES),
  answers: worksheetAnswersSchema,
  sharedWithTherapistId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
});
export type WorksheetResponseRecord = z.infer<typeof worksheetResponseSchema>;

/** Everything a client has chosen to share with one therapist. */
export const sharedWithTherapistSchema = z.object({
  client: z.object({ id: z.string().uuid(), fullName: z.string() }),
  journalEntries: z.array(journalEntrySchema),
  goals: z.array(goalSchema),
  worksheets: z.array(worksheetResponseSchema),
});
export type SharedWithTherapist = z.infer<typeof sharedWithTherapistSchema>;
