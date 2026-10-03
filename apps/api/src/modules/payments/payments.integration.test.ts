import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/db.js";
import { createTestUser } from "../../test/factories.js";

const app = createApp();

beforeEach(async () => {
  await prisma.$transaction([
    prisma.auditLogEntry.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.availabilitySlot.deleteMany(),
    prisma.clientProfile.deleteMany(),
    prisma.therapistProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

async function createPendingBooking(feeKES = 2000) {
  const { user: therapistUser } = await createTestUser("THERAPIST");
  await prisma.therapistProfile.update({ where: { userId: therapistUser.id }, data: { status: "ACTIVE", feeKES } });
  const startTime = new Date(Date.now() + 60 * 60 * 1000);
  const slot = await prisma.availabilitySlot.create({
    data: { therapistId: therapistUser.id, startTime, endTime: new Date(startTime.getTime() + 60 * 60 * 1000) },
  });
  const { accessToken, user: client } = await createTestUser("CLIENT");
  const bookRes = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${accessToken}`).send({ slotId: slot.id });
  return { bookingId: bookRes.body.booking.id as string, clientToken: accessToken, clientId: client.id };
}

function mpesaCallback(checkoutRequestId: string, succeeded: boolean, extra: { amount?: number; receipt?: string } = {}) {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: "merchant-1",
        CheckoutRequestID: checkoutRequestId,
        ResultCode: succeeded ? 0 : 1032,
        ResultDesc: succeeded ? "The service request is processed successfully." : "Request cancelled by user",
        ...(succeeded
          ? {
              CallbackMetadata: {
                Item: [
                  { Name: "Amount", Value: extra.amount ?? 2000 },
                  { Name: "MpesaReceiptNumber", Value: extra.receipt ?? "NLJ7RT61SV" },
                  { Name: "TransactionDate", Value: 20260917102115 },
                  { Name: "PhoneNumber", Value: 254712345678 },
                ],
              },
            }
          : {}),
      },
    },
  };
}

describe("POST /api/v1/payments/mpesa/initiate", () => {
  it("requires an Idempotency-Key header", async () => {
    const { bookingId, clientToken } = await createPendingBooking();
    const res = await request(app)
      .post("/api/v1/payments/mpesa/initiate")
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ bookingId });
    expect(res.status).toBe(400);
  });

  it("initiates a payment for a PENDING_PAYMENT booking owned by the caller", async () => {
    const { bookingId, clientToken } = await createPendingBooking(3000);
    const res = await request(app)
      .post("/api/v1/payments/mpesa/initiate")
      .set("Authorization", `Bearer ${clientToken}`)
      .set("Idempotency-Key", "idem-key-1")
      .send({ bookingId });

    expect(res.status).toBe(202);
    expect(res.body.payment.status).toBe("PENDING");
    expect(res.body.payment.amountKES).toBe(3000);
    expect(res.body.payment.provider).toBe("MPESA");
  });

  it("rejects a payment initiation for someone else's booking (404)", async () => {
    const { bookingId } = await createPendingBooking();
    const { accessToken: otherToken } = await createTestUser("CLIENT");
    const res = await request(app)
      .post("/api/v1/payments/mpesa/initiate")
      .set("Authorization", `Bearer ${otherToken}`)
      .set("Idempotency-Key", "idem-key-1")
      .send({ bookingId });
    expect(res.status).toBe(404);
  });

  it("replaying the exact same Idempotency-Key returns the same payment without erroring", async () => {
    const { bookingId, clientToken } = await createPendingBooking();
    const first = await request(app)
      .post("/api/v1/payments/mpesa/initiate")
      .set("Authorization", `Bearer ${clientToken}`)
      .set("Idempotency-Key", "same-key")
      .send({ bookingId });
    const second = await request(app)
      .post("/api/v1/payments/mpesa/initiate")
      .set("Authorization", `Bearer ${clientToken}`)
      .set("Idempotency-Key", "same-key")
      .send({ bookingId });

    expect(first.body.payment.id).toBe(second.body.payment.id);
    const all = await prisma.payment.findMany({ where: { bookingId } });
    expect(all).toHaveLength(1);
  });

  it("rejects a second initiate with a DIFFERENT idempotency key while one is already in flight (409)", async () => {
    const { bookingId, clientToken } = await createPendingBooking();
    await request(app)
      .post("/api/v1/payments/mpesa/initiate")
      .set("Authorization", `Bearer ${clientToken}`)
      .set("Idempotency-Key", "idem-key-a")
      .send({ bookingId });

    const res = await request(app)
      .post("/api/v1/payments/mpesa/initiate")
      .set("Authorization", `Bearer ${clientToken}`)
      .set("Idempotency-Key", "idem-key-b")
      .send({ bookingId });

    expect(res.status).toBe(409);
  });

  it("CONCURRENCY: exactly one of two simultaneous initiate calls for the same booking creates the Payment row", async () => {
    const { bookingId, clientToken } = await createPendingBooking();
    const [resA, resB] = await Promise.all([
      request(app).post("/api/v1/payments/mpesa/initiate").set("Authorization", `Bearer ${clientToken}`).set("Idempotency-Key", "idem-race-a").send({ bookingId }),
      request(app).post("/api/v1/payments/mpesa/initiate").set("Authorization", `Bearer ${clientToken}`).set("Idempotency-Key", "idem-race-b").send({ bookingId }),
    ]);
    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([202, 409]);

    const payments = await prisma.payment.findMany({ where: { bookingId } });
    expect(payments).toHaveLength(1);
  });

  it("allows retrying after a FAILED payment, reusing the same Payment row", async () => {
    const { bookingId, clientToken } = await createPendingBooking();
    const initRes = await request(app)
      .post("/api/v1/payments/mpesa/initiate")
      .set("Authorization", `Bearer ${clientToken}`)
      .set("Idempotency-Key", "attempt-1")
      .send({ bookingId });
    const checkoutId = (await prisma.payment.findUniqueOrThrow({ where: { id: initRes.body.payment.id } })).providerReference!;

    await request(app).post("/api/v1/payments/mpesa/callback").send(mpesaCallback(checkoutId, false));
    const afterFail = await prisma.payment.findUniqueOrThrow({ where: { id: initRes.body.payment.id } });
    expect(afterFail.status).toBe("FAILED");

    const retryRes = await request(app)
      .post("/api/v1/payments/mpesa/initiate")
      .set("Authorization", `Bearer ${clientToken}`)
      .set("Idempotency-Key", "attempt-2")
      .send({ bookingId });

    expect(retryRes.status).toBe(202);
    expect(retryRes.body.payment.id).toBe(initRes.body.payment.id); // same row, not a new one
    const all = await prisma.payment.findMany({ where: { bookingId } });
    expect(all).toHaveLength(1);
  });
});

describe("POST /api/v1/payments/mpesa/callback", () => {
  it("a successful callback marks the payment SUCCEEDED and confirms the booking", async () => {
    const { bookingId, clientToken } = await createPendingBooking(2500);
    const initRes = await request(app)
      .post("/api/v1/payments/mpesa/initiate")
      .set("Authorization", `Bearer ${clientToken}`)
      .set("Idempotency-Key", "idem-k1-key")
      .send({ bookingId });
    const checkoutId = (await prisma.payment.findUniqueOrThrow({ where: { id: initRes.body.payment.id } })).providerReference!;

    const res = await request(app).post("/api/v1/payments/mpesa/callback").send(mpesaCallback(checkoutId, true, { amount: 2500 }));
    expect(res.status).toBe(200);

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: initRes.body.payment.id } });
    expect(payment.status).toBe("SUCCEEDED");
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe("CONFIRMED");
  });

  it("IDEMPOTENCY: replaying the same successful callback twice only confirms the booking once", async () => {
    const { bookingId, clientToken } = await createPendingBooking();
    const initRes = await request(app)
      .post("/api/v1/payments/mpesa/initiate")
      .set("Authorization", `Bearer ${clientToken}`)
      .set("Idempotency-Key", "idem-k1-key")
      .send({ bookingId });
    const checkoutId = (await prisma.payment.findUniqueOrThrow({ where: { id: initRes.body.payment.id } })).providerReference!;

    await request(app).post("/api/v1/payments/mpesa/callback").send(mpesaCallback(checkoutId, true));
    const res2 = await request(app).post("/api/v1/payments/mpesa/callback").send(mpesaCallback(checkoutId, true));
    expect(res2.status).toBe(200); // Daraja always gets a 200 ack, even for a duplicate

    const payments = await prisma.payment.findMany({ where: { bookingId } });
    expect(payments).toHaveLength(1);
    expect(payments[0]?.status).toBe("SUCCEEDED");
  });

  it("a failed callback marks the payment FAILED and leaves the booking PENDING_PAYMENT", async () => {
    const { bookingId, clientToken } = await createPendingBooking();
    const initRes = await request(app)
      .post("/api/v1/payments/mpesa/initiate")
      .set("Authorization", `Bearer ${clientToken}`)
      .set("Idempotency-Key", "idem-k1-key")
      .send({ bookingId });
    const checkoutId = (await prisma.payment.findUniqueOrThrow({ where: { id: initRes.body.payment.id } })).providerReference!;

    await request(app).post("/api/v1/payments/mpesa/callback").send(mpesaCallback(checkoutId, false));

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: initRes.body.payment.id } });
    expect(payment.status).toBe("FAILED");
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe("PENDING_PAYMENT");
  });

  it("a late success callback for an already-expired (cancelled) booking does not silently re-confirm it", async () => {
    const { bookingId, clientToken } = await createPendingBooking();
    const initRes = await request(app)
      .post("/api/v1/payments/mpesa/initiate")
      .set("Authorization", `Bearer ${clientToken}`)
      .set("Idempotency-Key", "idem-k1-key")
      .send({ bookingId });
    const checkoutId = (await prisma.payment.findUniqueOrThrow({ where: { id: initRes.body.payment.id } })).providerReference!;

    // Simulate the release-expired-booking job already having cancelled this booking.
    await prisma.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });

    await request(app).post("/api/v1/payments/mpesa/callback").send(mpesaCallback(checkoutId, true));

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: initRes.body.payment.id } });
    expect(payment.status).toBe("SUCCEEDED"); // the money did move — this must not be lost
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe("CANCELLED"); // but the booking is not silently un-cancelled
  });

  it("always responds 200 even for a callback with an unknown CheckoutRequestID", async () => {
    const res = await request(app).post("/api/v1/payments/mpesa/callback").send(mpesaCallback("unknown-checkout-id", true));
    expect(res.status).toBe(200);
  });
});
