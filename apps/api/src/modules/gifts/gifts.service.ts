import { Prisma, type GiftVoucher } from "@prisma/client";
import { GIFT_VALIDITY_MONTHS, type GiftVoucherResponse, type PurchaseGiftRequest } from "@mind-hub/shared";
import { prisma } from "../../lib/db.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import { initiateStkPush, type ParsedMpesaCallback } from "../../lib/mpesa.js";
import { normalizePhone } from "../../lib/phone.js";
import { sendSms } from "../../lib/sms.js";
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";
import { formatKES } from "../../lib/money.js";
import { formatGiftCode, generateGiftCode, normalizeGiftCode } from "./giftCode.js";

function toResponse(voucher: GiftVoucher, now = new Date()): GiftVoucherResponse {
  const isExpired = voucher.status === "ACTIVE" && voucher.expiresAt <= now;
  const isPaid = voucher.status === "ACTIVE" || voucher.status === "USED_UP";
  return {
    id: voucher.id,
    code: isPaid ? formatGiftCode(voucher.code) : null,
    amountKES: voucher.amountKES,
    balanceKES: voucher.balanceKES,
    recipientName: voucher.recipientName,
    recipientPhone: voucher.recipientPhone,
    message: voucher.message,
    status: isExpired ? "EXPIRED" : voucher.status,
    expiresAt: voucher.expiresAt.toISOString(),
    createdAt: voucher.createdAt.toISOString(),
  };
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/** Creates the voucher row with a fresh code, retrying once on the (astronomically
 * unlikely) chance of a code collision. */
async function createVoucherRow(data: Omit<Prisma.GiftVoucherUncheckedCreateInput, "code">): Promise<GiftVoucher> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.giftVoucher.create({ data: { ...data, code: generateGiftCode() } });
    } catch (err) {
      const isCodeCollision =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002" && String(err.meta?.["target"]).includes("code");
      if (!isCodeCollision || attempt > 0) throw err;
    }
  }
}

/**
 * Starts a gift purchase: records the voucher, then sends the M-Pesa prompt to the
 * purchaser's phone. The voucher only becomes spendable when Safaricom's callback
 * confirms payment (handleGiftPaymentCallback). Replaying the same Idempotency-Key
 * returns the original voucher rather than prompting the phone a second time.
 */
export async function purchase(purchaserId: string, input: PurchaseGiftRequest, idempotencyKey: string): Promise<GiftVoucherResponse> {
  const replay = await prisma.giftVoucher.findUnique({ where: { idempotencyKey } });
  if (replay) {
    if (replay.purchaserId !== purchaserId) throw new ConflictError("This request was already used");
    return toResponse(replay);
  }

  const purchaser = await prisma.user.findUniqueOrThrow({ where: { id: purchaserId } });
  const voucher = await createVoucherRow({
    purchaserId,
    amountKES: input.amountKES,
    recipientName: input.recipientName || null,
    recipientPhone: input.recipientPhone ? normalizePhone(input.recipientPhone) : null,
    message: input.message || null,
    idempotencyKey,
    expiresAt: addMonths(new Date(), GIFT_VALIDITY_MONTHS),
  });

  try {
    const stk = await initiateStkPush({
      phone: purchaser.phone,
      amountKES: input.amountKES,
      accountReference: `GIFT-${voucher.id.slice(0, 8)}`,
      transactionDesc: "Mind Hub gift",
    });
    return toResponse(await prisma.giftVoucher.update({ where: { id: voucher.id }, data: { providerReference: stk.checkoutRequestId } }));
  } catch (err) {
    await prisma.giftVoucher.update({ where: { id: voucher.id }, data: { status: "PAYMENT_FAILED" } });
    throw err;
  }
}

export async function listMine(purchaserId: string): Promise<GiftVoucherResponse[]> {
  const vouchers = await prisma.giftVoucher.findMany({ where: { purchaserId }, orderBy: { createdAt: "desc" } });
  return vouchers.map((v) => toResponse(v));
}

/**
 * The gift branch of the M-Pesa callback (payments.service.ts). Returns false when the
 * CheckoutRequestID isn't a gift, so the caller can carry on. Idempotent like the
 * session-payment path: a duplicate callback for a settled voucher changes nothing.
 */
export async function handleGiftPaymentCallback(parsed: ParsedMpesaCallback): Promise<boolean> {
  const voucher = await prisma.giftVoucher.findUnique({ where: { providerReference: parsed.checkoutRequestId } });
  if (!voucher) return false;

  const settled = await prisma.giftVoucher.updateMany({
    where: { id: voucher.id, status: "PENDING_PAYMENT" },
    data: parsed.succeeded ? { status: "ACTIVE", balanceKES: voucher.amountKES } : { status: "PAYMENT_FAILED" },
  });
  if (settled.count === 0) {
    logger.info({ voucherId: voucher.id }, "Duplicate M-Pesa callback for a settled gift — ignoring");
    return true;
  }

  if (parsed.succeeded && voucher.recipientPhone) {
    const purchaser = await prisma.clientProfile.findUnique({ where: { userId: voucher.purchaserId }, select: { fullName: true } });
    const from = purchaser?.fullName.split(" ")[0] ?? "Someone";
    const greeting = voucher.recipientName ? `Hi ${voucher.recipientName}, ` : "";
    try {
      await sendSms(
        voucher.recipientPhone,
        `${greeting}${from} has sent you a Mind Hub gift of ${formatKES(voucher.amountKES)}. Use code ${formatGiftCode(voucher.code)} when you book: ${env.WEB_ORIGIN}/therapists` +
          (voucher.message ? `\n\n"${voucher.message}"` : ""),
      );
    } catch (err) {
      logger.error({ err, voucherId: voucher.id }, "Failed to text gift code to recipient");
    }
  }
  return true;
}

/**
 * Pays for a PENDING_PAYMENT booking from a gift's balance, all in one transaction: the
 * balance is decremented with a guarded update (so two people sharing a code can't both
 * spend the same money), the booking is confirmed only if it's still awaiting payment,
 * and a GIFT payment row records it. A gift must cover the whole fee — splitting a
 * session between a gift and M-Pesa isn't supported.
 */
export async function redeem(clientId: string, bookingId: string, rawCode: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { payment: true } });
  if (!booking || booking.clientId !== clientId) {
    throw new NotFoundError("Booking not found");
  }
  if (booking.status !== "PENDING_PAYMENT") {
    throw new ConflictError(`Booking is not awaiting payment (status: ${booking.status})`);
  }
  if (booking.payment && (booking.payment.status === "INITIATED" || booking.payment.status === "PENDING")) {
    throw new ConflictError("An M-Pesa payment is already in progress for this booking");
  }

  const therapist = await prisma.therapistProfile.findUniqueOrThrow({ where: { userId: booking.therapistId } });
  const feeKES = booking.feeKES ?? therapist.feeKES;

  const voucher = await prisma.giftVoucher.findUnique({ where: { code: normalizeGiftCode(rawCode) } });
  // Unpaid, failed and unknown codes all get the same answer, so a code's existence
  // can't be probed.
  if (!voucher || (voucher.status !== "ACTIVE" && voucher.status !== "USED_UP")) {
    throw new NotFoundError("We couldn't find a gift with that code");
  }
  const now = new Date();
  if (voucher.expiresAt <= now) {
    throw new ConflictError("This gift has expired");
  }
  if (voucher.balanceKES < feeKES) {
    throw new ConflictError(
      voucher.balanceKES === 0
        ? "This gift has already been used up"
        : `This gift has ${formatKES(voucher.balanceKES)} left, which doesn't cover this session's ${formatKES(feeKES)} fee`,
    );
  }

  return prisma.$transaction(async (tx) => {
    const debited = await tx.giftVoucher.updateMany({
      where: { id: voucher.id, status: "ACTIVE", balanceKES: { gte: feeKES }, expiresAt: { gt: now } },
      data: { balanceKES: { decrement: feeKES } },
    });
    if (debited.count === 0) {
      throw new ConflictError("This gift no longer has enough left for this session");
    }
    const updatedVoucher = await tx.giftVoucher.findUniqueOrThrow({ where: { id: voucher.id } });
    if (updatedVoucher.balanceKES === 0) {
      await tx.giftVoucher.update({ where: { id: voucher.id }, data: { status: "USED_UP" } });
    }

    const confirmed = await tx.booking.updateMany({ where: { id: bookingId, status: "PENDING_PAYMENT" }, data: { status: "CONFIRMED" } });
    if (confirmed.count === 0) {
      throw new ConflictError("This booking's hold expired before the gift could be applied");
    }

    const redemption = await tx.giftRedemption.create({ data: { voucherId: voucher.id, bookingId, clientId, amountKES: feeKES } });
    const paymentData = {
      provider: "GIFT" as const,
      status: "SUCCEEDED" as const,
      amountKES: feeKES,
      idempotencyKey: `gift-redemption-${redemption.id}`,
      providerReference: null,
    };
    // A booking keeps one Payment row; a previously FAILED M-Pesa attempt is reused.
    const payment = booking.payment
      ? await tx.payment.update({ where: { id: booking.payment.id }, data: paymentData })
      : await tx.payment.create({ data: { bookingId, ...paymentData } });

    return { payment, remainingBalanceKES: updatedVoucher.balanceKES };
  });
}
