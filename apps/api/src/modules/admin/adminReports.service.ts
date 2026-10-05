import { BOOKING_STATUSES, type ReportsOverviewResponse } from "@mind-hub/shared";
import { prisma } from "../../lib/db.js";

/**
 * Deliberately not "count of registered users" (BUILD_PLAN.md §10) — bookings by
 * status, completion/cancellation rates, and revenue are the numbers that actually say
 * whether the platform is working, not just growing.
 */
export async function getReportsOverview(): Promise<ReportsOverviewResponse> {
  const [bookingCounts, revenue, openComplaints, therapistSwitches, pendingFeeAssistance] = await Promise.all([
    prisma.booking.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.payment.aggregate({ where: { status: "SUCCEEDED" }, _sum: { amountKES: true } }),
    prisma.complaint.count({ where: { status: "OPEN" } }),
    prisma.therapistSwitch.count(),
    prisma.feeAssistanceApplication.count({ where: { status: "PENDING" } }),
  ]);

  const bookingsByStatus = Object.fromEntries(BOOKING_STATUSES.map((status) => [status, 0])) as Record<
    (typeof BOOKING_STATUSES)[number],
    number
  >;
  let totalBookings = 0;
  for (const row of bookingCounts) {
    bookingsByStatus[row.status] = row._count.status;
    totalBookings += row._count.status;
  }

  const completed = bookingsByStatus.COMPLETED;
  const noShow = bookingsByStatus.NO_SHOW;
  const cancelled = bookingsByStatus.CANCELLED;

  return {
    totalBookings,
    bookingsByStatus,
    completionRate: completed + noShow > 0 ? completed / (completed + noShow) : 0,
    cancellationRate: totalBookings > 0 ? cancelled / totalBookings : 0,
    totalRevenueKES: revenue._sum.amountKES ?? 0,
    openComplaints,
    therapistSwitches,
    pendingFeeAssistance,
  };
}
