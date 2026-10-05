import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/db.js";
import { createCareRelationship, createTestUser } from "../../test/factories.js";

vi.mock("../../lib/sms.js", () => ({ sendSms: vi.fn(), isSmsStubMode: () => true }));
const { sendSms } = await import("../../lib/sms.js");
const sendSmsMock = vi.mocked(sendSms);

const app = createApp();

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function mpesaCallback(checkoutRequestId: string, succeeded: boolean) {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: "merchant",
        CheckoutRequestID: checkoutRequestId,
        ResultCode: succeeded ? 0 : 1032,
        ResultDesc: succeeded ? "Success" : "Request cancelled by user",
        ...(succeeded ? { CallbackMetadata: { Item: [{ Name: "MpesaReceiptNumber", Value: "QWE123" }] } } : {}),
      },
    },
  };
}

let keyCounter = 0;
async function buyGift(amountKES: number, extra: Record<string, unknown> = {}) {
  const purchaser = await createTestUser("CLIENT", { fullName: "Njeri Wambui" });
  keyCounter += 1;
  const res = await request(app)
    .post("/api/v1/gifts")
    .set(auth(purchaser.accessToken))
    .set("Idempotency-Key", `gift-key-${keyCounter}-${Date.now()}`)
    .send({ amountKES, ...extra });
  const voucher = await prisma.giftVoucher.findUniqueOrThrow({ where: { id: res.body.gift.id } });
  return { purchaser, res, voucher };
}

async function buyPaidGift(amountKES: number) {
  const bought = await buyGift(amountKES);
  await request(app).post("/api/v1/payments/mpesa/callback").send(mpesaCallback(bought.voucher.providerReference as string, true));
  const voucher = await prisma.giftVoucher.findUniqueOrThrow({ where: { id: bought.voucher.id } });
  return { ...bought, voucher };
}

/** A PENDING_PAYMENT booking at the given fee for a fresh client. */
async function pendingBooking(feeKES = 2500) {
  return createCareRelationship({ status: "PENDING_PAYMENT", feeKES });
}

beforeEach(() => {
  sendSmsMock.mockReset();
});

describe("buying a gift", () => {
  it("prompts M-Pesa and keeps the code hidden until payment succeeds", async () => {
    const { res, voucher } = await buyGift(5000, { recipientName: "Mama", recipientPhone: "0711000111" });

    expect(res.status).toBe(202);
    expect(res.body.gift).toMatchObject({ status: "PENDING_PAYMENT", code: null, amountKES: 5000, balanceKES: 0 });
    expect(voucher.providerReference).toMatch(/^stub-/);
  });

  it("returns the same gift when a request is retried with the same Idempotency-Key", async () => {
    const purchaser = await createTestUser("CLIENT");
    const send = () =>
      request(app).post("/api/v1/gifts").set(auth(purchaser.accessToken)).set("Idempotency-Key", "same-key-123").send({ amountKES: 2500 });

    const first = await send();
    const second = await send();
    expect(second.body.gift.id).toBe(first.body.gift.id);
    expect(await prisma.giftVoucher.count()).toBe(1);
  });

  it("activates on a successful callback and texts the recipient their code", async () => {
    const { purchaser, voucher } = await buyGift(5000, { recipientName: "Mama", recipientPhone: "0711000111", message: "Thinking of you" });

    await request(app).post("/api/v1/payments/mpesa/callback").send(mpesaCallback(voucher.providerReference as string, true));

    const mine = await request(app).get("/api/v1/gifts/mine").set(auth(purchaser.accessToken));
    expect(mine.body.gifts[0]).toMatchObject({ status: "ACTIVE", balanceKES: 5000 });
    expect(mine.body.gifts[0].code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);

    expect(sendSmsMock).toHaveBeenCalledTimes(1);
    const [to, text] = sendSmsMock.mock.calls[0] ?? [];
    expect(to).toBe("+254711000111");
    expect(text).toContain("Hi Mama, Njeri has sent you");
    expect(text).toContain(mine.body.gifts[0].code);
    expect(text).toContain('"Thinking of you"');
  });

  it("marks a failed payment, and ignores a duplicate callback", async () => {
    const { voucher } = await buyGift(2500);
    await request(app).post("/api/v1/payments/mpesa/callback").send(mpesaCallback(voucher.providerReference as string, false));
    await request(app).post("/api/v1/payments/mpesa/callback").send(mpesaCallback(voucher.providerReference as string, true));

    expect(await prisma.giftVoucher.findUniqueOrThrow({ where: { id: voucher.id } })).toMatchObject({ status: "PAYMENT_FAILED", balanceKES: 0 });
  });

  it("rejects amounts outside the allowed range", async () => {
    const purchaser = await createTestUser("CLIENT");
    const res = await request(app).post("/api/v1/gifts").set(auth(purchaser.accessToken)).set("Idempotency-Key", "tiny-gift-1").send({ amountKES: 100 });
    expect(res.status).toBe(400);
  });
});

describe("redeeming a gift", () => {
  it("pays for a booking from the balance and confirms it", async () => {
    const { voucher } = await buyPaidGift(6000);
    const { client, booking } = await pendingBooking(2500);

    const res = await request(app)
      .post("/api/v1/gifts/redeem")
      .set(auth(client.accessToken))
      .send({ bookingId: booking.id, code: voucher.code.toLowerCase() });

    expect(res.status).toBe(200);
    expect(res.body.remainingBalanceKES).toBe(3500);
    expect(res.body.payment).toMatchObject({ provider: "GIFT", status: "SUCCEEDED", amountKES: 2500 });
    expect(await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).toMatchObject({ status: "CONFIRMED" });
  });

  it("marks a gift used up when its balance reaches zero", async () => {
    const { voucher } = await buyPaidGift(2500);
    const first = await pendingBooking(2500);
    const second = await pendingBooking(2500);

    await request(app).post("/api/v1/gifts/redeem").set(auth(first.client.accessToken)).send({ bookingId: first.booking.id, code: voucher.code });
    const res = await request(app).post("/api/v1/gifts/redeem").set(auth(second.client.accessToken)).send({ bookingId: second.booking.id, code: voucher.code });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/already been used up/);
    expect(await prisma.giftVoucher.findUniqueOrThrow({ where: { id: voucher.id } })).toMatchObject({ status: "USED_UP", balanceKES: 0 });
  });

  it("explains when the balance doesn't cover the fee", async () => {
    const { voucher } = await buyPaidGift(1000);
    const { client, booking } = await pendingBooking(2500);

    const res = await request(app).post("/api/v1/gifts/redeem").set(auth(client.accessToken)).send({ bookingId: booking.id, code: voucher.code });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/KES 1,000 left.*KES 2,500 fee/);
  });

  it("lets only one of two simultaneous redemptions spend the same balance", async () => {
    const { voucher } = await buyPaidGift(2500);
    const a = await pendingBooking(2500);
    const b = await pendingBooking(2500);

    const results = await Promise.all([
      request(app).post("/api/v1/gifts/redeem").set(auth(a.client.accessToken)).send({ bookingId: a.booking.id, code: voucher.code }),
      request(app).post("/api/v1/gifts/redeem").set(auth(b.client.accessToken)).send({ bookingId: b.booking.id, code: voucher.code }),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await prisma.giftRedemption.count()).toBe(1);
    expect((await prisma.giftVoucher.findUniqueOrThrow({ where: { id: voucher.id } })).balanceKES).toBe(0);
  });

  it("gives the same answer for unknown and unpaid codes", async () => {
    const { voucher: unpaid } = await buyGift(5000);
    const { client, booking } = await pendingBooking();

    for (const code of ["ZZZZZ-ZZZZZ", unpaid.code]) {
      const res = await request(app).post("/api/v1/gifts/redeem").set(auth(client.accessToken)).send({ bookingId: booking.id, code });
      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe("We couldn't find a gift with that code");
    }
  });

  it("refuses an expired gift", async () => {
    const { voucher } = await buyPaidGift(5000);
    await prisma.giftVoucher.update({ where: { id: voucher.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const { client, booking } = await pendingBooking();

    const res = await request(app).post("/api/v1/gifts/redeem").set(auth(client.accessToken)).send({ bookingId: booking.id, code: voucher.code });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/expired/);
  });

  it("won't redeem while an M-Pesa payment is in progress for the booking", async () => {
    const { voucher } = await buyPaidGift(5000);
    const { client, booking } = await pendingBooking();
    await request(app)
      .post("/api/v1/payments/mpesa/initiate")
      .set(auth(client.accessToken))
      .set("Idempotency-Key", "mpesa-in-flight-1")
      .send({ bookingId: booking.id });

    const res = await request(app).post("/api/v1/gifts/redeem").set(auth(client.accessToken)).send({ bookingId: booking.id, code: voucher.code });
    expect(res.status).toBe(409);
  });

  it("returns 404 for someone else's booking", async () => {
    const { voucher } = await buyPaidGift(5000);
    const { booking } = await pendingBooking();
    const stranger = await createTestUser("CLIENT");

    const res = await request(app).post("/api/v1/gifts/redeem").set(auth(stranger.accessToken)).send({ bookingId: booking.id, code: voucher.code });
    expect(res.status).toBe(404);
  });
});
