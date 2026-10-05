import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/db.js";
import { createTestUser } from "../../test/factories.js";

const app = createApp();

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

const application = { incomeBand: "UNDER_10K", householdSize: 4, reason: "I lost my job last month and support two children." };

async function approvedClient() {
  const client = await createTestUser("CLIENT", { fullName: "Approved Client" });
  const admin = await createTestUser("ADMIN");
  const applied = await request(app).post("/api/v1/fee-assistance").set(auth(client.accessToken)).send(application);
  await request(app)
    .post(`/api/v1/admin/fee-assistance/${applied.body.application.id}/decision`)
    .set(auth(admin.accessToken))
    .send({ decision: "APPROVED" });
  return client;
}

async function therapistWithSlot(feeKES: number, reducedFeeKES: number | null) {
  const therapist = await createTestUser("THERAPIST");
  await prisma.therapistProfile.update({ where: { userId: therapist.user.id }, data: { status: "ACTIVE", feeKES, reducedFeeKES } });
  const startTime = new Date(Date.now() + 2 * 86_400_000);
  const slot = await prisma.availabilitySlot.create({
    data: { therapistId: therapist.user.id, startTime, endTime: new Date(startTime.getTime() + 3_600_000) },
  });
  return { therapist, slot };
}

describe("applying for reduced fees", () => {
  it("records an application and allows only one open at a time", async () => {
    const client = await createTestUser("CLIENT");

    const first = await request(app).post("/api/v1/fee-assistance").set(auth(client.accessToken)).send(application);
    expect(first.status).toBe(201);
    expect(first.body.application.status).toBe("PENDING");

    const second = await request(app).post("/api/v1/fee-assistance").set(auth(client.accessToken)).send(application);
    expect(second.status).toBe(409);

    const mine = await request(app).get("/api/v1/fee-assistance/me").set(auth(client.accessToken));
    expect(mine.body).toMatchObject({ isEligible: false, application: { status: "PENDING", incomeBand: "UNDER_10K" } });
  });

  it("requires a reason", async () => {
    const client = await createTestUser("CLIENT");
    const res = await request(app).post("/api/v1/fee-assistance").set(auth(client.accessToken)).send({ ...application, reason: "" });
    expect(res.status).toBe(400);
  });
});

describe("admin review", () => {
  it("approves for six months, and can't be decided twice", async () => {
    const client = await createTestUser("CLIENT", { fullName: "Wairimu" });
    const admin = await createTestUser("ADMIN");
    const applied = await request(app).post("/api/v1/fee-assistance").set(auth(client.accessToken)).send(application);

    const pending = await request(app).get("/api/v1/admin/fee-assistance?status=PENDING").set(auth(admin.accessToken));
    expect(pending.body.applications).toHaveLength(1);
    expect(pending.body.applications[0].clientName).toBe("Wairimu");

    const decided = await request(app)
      .post(`/api/v1/admin/fee-assistance/${applied.body.application.id}/decision`)
      .set(auth(admin.accessToken))
      .send({ decision: "APPROVED", note: "Approved, welcome." });
    expect(decided.status).toBe(200);
    const monthsAhead = (new Date(decided.body.application.expiresAt).getTime() - Date.now()) / (30 * 86_400_000);
    expect(monthsAhead).toBeGreaterThan(5.8);
    expect(monthsAhead).toBeLessThan(6.2);

    const again = await request(app)
      .post(`/api/v1/admin/fee-assistance/${applied.body.application.id}/decision`)
      .set(auth(admin.accessToken))
      .send({ decision: "DECLINED" });
    expect(again.status).toBe(409);

    const mine = await request(app).get("/api/v1/fee-assistance/me").set(auth(client.accessToken));
    expect(mine.body.isEligible).toBe(true);

    const overview = await request(app).get("/api/v1/admin/reports/overview").set(auth(admin.accessToken));
    expect(overview.body.report.pendingFeeAssistance).toBe(0);
  });

  it("is admin-only", async () => {
    const client = await createTestUser("CLIENT");
    const res = await request(app).get("/api/v1/admin/fee-assistance").set(auth(client.accessToken));
    expect(res.status).toBe(403);
  });
});

describe("booking with reduced fees", () => {
  it("charges an approved client the reduced fee, fixed at booking time", async () => {
    const client = await approvedClient();
    const { therapist, slot } = await therapistWithSlot(3000, 1000);

    const booked = await request(app).post("/api/v1/bookings").set(auth(client.accessToken)).send({ slotId: slot.id });
    const detail = await request(app).get(`/api/v1/bookings/${booked.body.booking.id}`).set(auth(client.accessToken));
    expect(detail.body.booking).toMatchObject({ feeKES: 1000, reducedFee: true });

    // A fee change after booking doesn't change what this client pays.
    await prisma.therapistProfile.update({ where: { userId: therapist.user.id }, data: { feeKES: 5000, reducedFeeKES: 4000 } });
    const payment = await request(app)
      .post("/api/v1/payments/mpesa/initiate")
      .set(auth(client.accessToken))
      .set("Idempotency-Key", "reduced-fee-test-key")
      .send({ bookingId: booked.body.booking.id });
    expect(payment.body.payment.amountKES).toBe(1000);
  });

  it("charges the standard fee when the client isn't approved, or the therapist doesn't offer a reduced fee", async () => {
    const unapproved = await createTestUser("CLIENT");
    const approved = await approvedClient();
    const offering = await therapistWithSlot(3000, 1000);
    const notOffering = await therapistWithSlot(2500, null);

    const a = await request(app).post("/api/v1/bookings").set(auth(unapproved.accessToken)).send({ slotId: offering.slot.id });
    const b = await request(app).post("/api/v1/bookings").set(auth(approved.accessToken)).send({ slotId: notOffering.slot.id });

    expect(await prisma.booking.findUniqueOrThrow({ where: { id: a.body.booking.id } })).toMatchObject({ feeKES: 3000, reducedFee: false });
    expect(await prisma.booking.findUniqueOrThrow({ where: { id: b.body.booking.id } })).toMatchObject({ feeKES: 2500, reducedFee: false });
  });
});

describe("therapists offering reduced fees", () => {
  it("filters the directory to therapists who offer one", async () => {
    await therapistWithSlot(3000, 1000);
    await therapistWithSlot(3000, null);

    const res = await request(app).get("/api/v1/therapists?reducedFee=true");
    expect(res.body.therapists).toHaveLength(1);
    expect(res.body.therapists[0].reducedFeeKES).toBe(1000);
  });

  it("rejects a reduced fee that isn't lower than the standard fee", async () => {
    const therapist = await createTestUser("THERAPIST");
    const res = await request(app)
      .patch("/api/v1/therapists/me/profile")
      .set(auth(therapist.accessToken))
      .send({ specialties: ["Parenting support"], languages: ["English"], feeKES: 2000, reducedFeeKES: 2000 });
    expect(res.status).toBe(400);
  });
});
