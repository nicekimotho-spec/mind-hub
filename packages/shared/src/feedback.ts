import { z } from "zod";

export const createFeedbackRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});
export type CreateFeedbackRequest = z.infer<typeof createFeedbackRequestSchema>;

export const feedbackSchema = z.object({
  id: z.string().uuid(),
  bookingId: z.string().uuid(),
  rating: z.number(),
  comment: z.string().nullable(),
  createdAt: z.string(),
});
export type FeedbackResponse = z.infer<typeof feedbackSchema>;
