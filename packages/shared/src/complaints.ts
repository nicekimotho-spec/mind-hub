import { z } from "zod";

export const COMPLAINT_STATUSES = ["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const createComplaintRequestSchema = z.object({
  description: z.string().trim().min(10, "Please provide a bit more detail (min 10 characters)").max(2000),
});
export type CreateComplaintRequest = z.infer<typeof createComplaintRequestSchema>;

/** Resolving or closing a complaint without saying how is not a real resolution — the
 * schema enforces that server-side rather than trusting the admin UI to remember to ask. */
export const updateComplaintRequestSchema = z
  .object({
    status: z.enum(COMPLAINT_STATUSES),
    resolution: z.string().trim().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.status === "RESOLVED" || data.status === "CLOSED") && !data.resolution) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A resolution note is required when marking a complaint resolved or closed",
        path: ["resolution"],
      });
    }
  });
export type UpdateComplaintRequest = z.infer<typeof updateComplaintRequestSchema>;

export const complaintSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  description: z.string(),
  status: z.enum(COMPLAINT_STATUSES),
  resolution: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ComplaintResponse = z.infer<typeof complaintSchema>;
