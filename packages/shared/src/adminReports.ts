import { z } from "zod";
import { BOOKING_STATUSES } from "./booking.js";

export const bookingsByStatusSchema = z.record(z.enum(BOOKING_STATUSES), z.number());

export const reportsOverviewSchema = z.object({
  totalBookings: z.number(),
  bookingsByStatus: bookingsByStatusSchema,
  completionRate: z.number(), // COMPLETED / (COMPLETED + NO_SHOW)
  cancellationRate: z.number(), // CANCELLED / totalBookings
  totalRevenueKES: z.number(), // sum of SUCCEEDED payments
  openComplaints: z.number(),
});
export type ReportsOverviewResponse = z.infer<typeof reportsOverviewSchema>;
