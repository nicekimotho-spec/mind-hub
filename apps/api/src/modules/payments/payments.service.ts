import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/db.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import { initiateStkPush, parseMpesaCallback, type MpesaStkCallbackPayload } from "../../lib/mpesa.js";
import { logger } from "../../lib/logger.js";

/**
 * Books a payment attempt for a booking. Payment.bookingId is unique — only one Payment
 * row can ever exist per booking — so a retry after a FAILED attempt (wrong PIN,
 * insufficient funds, user closed the STK prompt) updates that same row in place rather
 * than inserting a second one; a genuinely new idempotency key represents a new attempt,
 * not a new payment record. An in-flight (INITIATED/PENDING) attempt is never restarted
 * by a bare retry — that would double-prompt the client's phone, a known real-world
 * M-Pesa integration bug — unless the caller replays the exact same idempotency key, in
 * which case the existing record is returned untouched.
 */
export async function initiatePayment(clientId: string, bookingId: string, idempotencyKey: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });
  if (!booking || booking.clientId !== clientId) {
    throw new NotFoundError("Booking not found");
  }
  if (booking.status !== "PENDING_PAYMENT") {
    throw new ConflictError(`Booking is not awaiting payment (status: ${booking.status})`);
  }

  // Booking.therapistId is a plain field, not a Prisma relation (see schema.prisma) —
  // the therapist's current fee is looked up separately.
  const [client, therapist] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: clientId } }),
    prisma.therapistProfile.findUniqueOrThrow({ where: { userId: booking.therapistId } }),
  ]);
  const existing = booking.payment;

  if (existing) {
    if (existing.idempotencyKey === idempotencyKey) {
      return existing; // exact replay of a request already in flight or completed — safe no-op
    }
    if (existing.status === "INITIATED" || existing.status === "PENDING") {
      throw new ConflictError("A payment is already in progress for this booking");
    }
    if (existing.status === "SUCCEEDED") {
      throw new ConflictError("This booking has already been paid for");
    }
    // status === "FAILED" falls through to a fresh attempt below, reusing the same row.
  }

  const stk = await initiateStkPush({
    phone: client.phone,
    amountKES: therapist.feeKES,
    accountReference: booking.id,
    transactionDesc: "Mind Hub counselling session",
  });

  try {
    if (existing) {
      return await prisma.payment.update({
        where: { id: existing.id },
        data: {
          status: "PENDING",
          idempotencyKey,
          providerReference: stk.checkoutRequestId,
          amountKES: therapist.feeKES,
        },
      });
    }
    return await prisma.payment.create({
      data: {
        bookingId,
        provider: "MPESA",
        amountKES: therapist.feeKES,
        status: "PENDING",
        idempotencyKey,
        providerReference: stk.checkoutRequestId,
      },
    });
  } catch (err) {
    // Two concurrent initiate requests for the same booking can both pass the
    // `existing` check above before either has written its row; Payment.bookingId's
    // unique constraint is the backstop, surfaced here as a clean 409 instead of a raw
    // Prisma error (mirrors the booking-slot race handled in booking.service.ts §8.1).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError("A payment has already been initiated for this booking");
    }
    throw err;
  }
}

/**
 * Handles Safaricom's asynchronous STK push result callback. Always returns a result —
 * Daraja expects a 200 acknowledgement regardless of business outcome and will
 * aggressively retry the callback otherwise, which this function's idempotency (keyed
 * on the terminal payment.status, not just providerReference) handles safely.
 */
export async function handleMpesaCallback(payload: MpesaStkCallbackPayload): Promise<void> {
  const parsed = parseMpesaCallback(payload);

  const payment = await prisma.payment.findUnique({
    where: { providerReference: parsed.checkoutRequestId },
    include: { booking: true },
  });
  if (!payment) {
    logger.warn({ checkoutRequestId: parsed.checkoutRequestId }, "M-Pesa callback for unknown CheckoutRequestID");
    return;
  }

  if (payment.status === "SUCCEEDED" || payment.status === "FAILED") {
    logger.info({ paymentId: payment.id }, "Duplicate M-Pesa callback for an already-finalized payment — ignoring");
    return;
  }

  if (!parsed.succeeded) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return;
  }

  if (payment.booking.status !== "PENDING_PAYMENT") {
    // The booking's payment hold expired (and the slot was released back to the pool —
    // see releaseExpiredBookings in booking.service.ts) before this success callback
    // arrived. The client's money has genuinely moved, but the slot may now belong to
    // someone else, so the booking is NOT silently confirmed. This still needs a real
    // refund flow (out of MVP scope) — logging loudly is the deliberate stopgap so it's
    // never silently lost.
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED" } });
    logger.error(
      { paymentId: payment.id, bookingId: payment.bookingId, bookingStatus: payment.booking.status },
      "M-Pesa payment succeeded for a booking that is no longer PENDING_PAYMENT — refund required, not automated in this MVP",
    );
    return;
  }

  await prisma.$transaction([
    prisma.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED" } }),
    prisma.booking.update({ where: { id: payment.bookingId }, data: { status: "CONFIRMED" } }),
  ]);
}
