import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/db.js";
import { createTestUser } from "../../test/factories.js";

const app = createApp();

beforeEach(async () => {
  await prisma.$transaction([
    prisma.auditLogEntry.deleteMany(),
    prisma.complaint.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.availabilitySlot.deleteMany(),
    prisma.clientProfile.deleteMany(),
    prisma.therapistProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

async function makeBooking(status: "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW") {
  const { user: therapistUser } = await createTestUser("THERAPIST");
  await prisma.therapistProfile.update({ where: { userId: therapistUser.id }, data: { status: "ACTIVE" } });
  const startTime = new Date(Date.now() + 60 * 60 * 1000);
  const slot = await prisma.availabilitySlot.create({
    data: { therapistId: therapistUser.id, startTime, endTime: new Date(startTime.getTime() + 60 * 60 * 1000), isBooked: true },
  });
  const { user: clientUser } = await createTestUser("CLIENT");
  const booking = await prisma.booking.create({
    data: { clientId: clientUser.id, therapistId: therapistUser.id, slotId: slot.id, status, expiresAt: new Date() },
  });
  return booking;
}

describe("GET /api/v1/admin/reports/overview", () => {
  it("rejects a non-admin (403)", async () => {
    const { accessToken } = await createTestUser("CLIENT");
    const res = await request(app).get("/api/v1/admin/reports/overview").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it("computes booking counts, rates, and revenue correctly", async () => {
    const completed1 = await makeBooking("COMPLETED");
    await makeBooking("COMPLETED");
    await makeBooking("NO_SHOW");
    await makeBooking("CANCELLED");
    await makeBooking("PENDING_PAYMENT");

    await prisma.payment.create({
      data: { bookingId: completed1.id, provider: "MPESA", amountKES: 2000, status: "SUCCEEDED", idempotencyKey: "k1", providerReference: "ref1" },
    });

    const { accessToken: adminToken } = await createTestUser("ADMIN");
    const res = await request(app).get("/api/v1/admin/reports/overview").set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const report = res.body.report;
    expect(report.totalBookings).toBe(5);
    expect(report.bookingsByStatus.COMPLETED).toBe(2);
    expect(report.bookingsByStatus.NO_SHOW).toBe(1);
    expect(report.bookingsByStatus.CANCELLED).toBe(1);
    expect(report.bookingsByStatus.PENDING_PAYMENT).toBe(1);
    // completionRate = COMPLETED / (COMPLETED + NO_SHOW) = 2 / 3
    expect(report.completionRate).toBeCloseTo(2 / 3, 5);
    // cancellationRate = CANCELLED / total = 1 / 5
    expect(report.cancellationRate).toBeCloseTo(1 / 5, 5);
    expect(report.totalRevenueKES).toBe(2000);
  });

  it("returns zeroed rates when there are no bookings at all", async () => {
    const { accessToken: adminToken } = await createTestUser("ADMIN");
    const res = await request(app).get("/api/v1/admin/reports/overview").set("Authorization", `Bearer ${adminToken}`);

    expect(res.body.report.totalBookings).toBe(0);
    expect(res.body.report.completionRate).toBe(0);
    expect(res.body.report.cancellationRate).toBe(0);
    expect(res.body.report.totalRevenueKES).toBe(0);
  });

  it("counts only OPEN complaints toward openComplaints", async () => {
    const { user } = await createTestUser("CLIENT");
    await prisma.complaint.create({ data: { userId: user.id, description: "Open complaint text goes here." } });
    await prisma.complaint.create({ data: { userId: user.id, description: "Resolved complaint text here.", status: "RESOLVED" } });

    const { accessToken: adminToken } = await createTestUser("ADMIN");
    const res = await request(app).get("/api/v1/admin/reports/overview").set("Authorization", `Bearer ${adminToken}`);
    expect(res.body.report.openComplaints).toBe(1);
  });
});
