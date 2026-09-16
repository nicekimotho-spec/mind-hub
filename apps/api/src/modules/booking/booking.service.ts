import type { CreateBookingRequest } from "@mind-hub/shared";
import { prisma } from "../../lib/db.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../../lib/errors.js";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

/**
 * Books a slot inside a transaction using an atomic guarded UPDATE rather than a
 * SELECT-then-UPDATE — see BUILD_PLAN.md §8.1. `updateMany({ where: { id, isBooked:
 * false }, ... })` is a single statement Postgres executes atomically per row: if two
 * requests race for the same slot, exactly one UPDATE matches the still-false row
 * (count: 1) and the other matches nothing (count: 0), because Postgres serializes
 * concurrent UPDATEs to the same row. There is no window between "check" and "write"
 * for a second request to slip through, unlike a naive findUnique-then-update.
 */
export async function createBooking(clientId: string, input: CreateBookingRequest) {
  const slot = await prisma.availabilitySlot.findUnique({
    where: { id: input.slotId },
    include: { therapist: true },
  });
  if (!slot) {
    throw new NotFoundError("Availability slot not found");
  }
  if (slot.therapist.status !== "ACTIVE") {
    throw new ConflictError("This therapist is not currently accepting bookings");
  }
  if (slot.startTime.getTime() <= Date.now()) {
    throw new ConflictError("This slot is in the past and can no longer be booked");
  }
  if (slot.isBooked) {
    // Fast, friendly path for the common case; the transaction below is the real guard.
    throw new ConflictError("This time slot is no longer available");
  }

  const expiresAt = new Date(Date.now() + env.BOOKING_HOLD_MINUTES * 60_000);

  return prisma.$transaction(async (tx) => {
    const guardedUpdate = await tx.availabilitySlot.updateMany({
      where: { id: input.slotId, isBooked: false },
      data: { isBooked: true },
    });
    if (guardedUpdate.count === 0) {
      throw new ConflictError("This time slot is no longer available");
    }

    return tx.booking.create({
      data: {
        clientId,
        therapistId: slot.therapistId,
        slotId: input.slotId,
        status: "PENDING_PAYMENT",
        expiresAt,
      },
    });
  });
}

/** Scoped to the booking's client or therapist — anyone else gets 404, never 403, so a
 * booking's existence isn't confirmed to an unrelated user (BUILD_PLAN.md §8.6). */
async function getOwnedBooking(actorId: string, actorRole: string, bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { slot: true } });
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }
  const isOwnerClient = booking.clientId === actorId;
  const isOwnerTherapist = actorRole === "THERAPIST" && booking.therapistId === actorId;
  if (!isOwnerClient && !isOwnerTherapist) {
    throw new NotFoundError("Booking not found");
  }
  return booking;
}

export async function cancelBooking(actorId: string, actorRole: string, bookingId: string) {
  const booking = await getOwnedBooking(actorId, actorRole, bookingId);

  if (booking.status === "CANCELLED" || booking.status === "COMPLETED" || booking.status === "NO_SHOW") {
    throw new ConflictError(`Booking cannot be cancelled from its current status (${booking.status})`);
  }

  if (booking.status === "CONFIRMED") {
    const hoursUntilStart = (booking.slot.startTime.getTime() - Date.now()) / (60 * 60 * 1000);
    if (hoursUntilStart < env.CANCELLATION_WINDOW_HOURS) {
      throw new ForbiddenError(
        `Confirmed bookings can only be cancelled at least ${env.CANCELLATION_WINDOW_HOURS} hours before the session`,
      );
    }
  }
  // PENDING_PAYMENT bookings are always cancellable — nothing has been confirmed yet.

  return prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });
    await tx.availabilitySlot.update({ where: { id: booking.slotId }, data: { isBooked: false } });
    return updated;
  });
}

/**
 * Releases PENDING_PAYMENT bookings whose payment hold has expired, freeing the slot
 * back up (BUILD_PLAN.md §7, §8.2) — otherwise an abandoned checkout would lock a slot
 * forever. Exported standalone so it can be driven directly by tests without depending
 * on a real BullMQ tick, and called from the repeatable job in jobs/releaseExpiredBookings.ts.
 */
export async function releaseExpiredBookings(): Promise<number> {
  const expired = await prisma.booking.findMany({
    where: { status: "PENDING_PAYMENT", expiresAt: { lt: new Date() } },
    select: { id: true, slotId: true },
  });

  for (const booking of expired) {
    await prisma.$transaction([
      prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } }),
      prisma.availabilitySlot.update({ where: { id: booking.slotId }, data: { isBooked: false } }),
    ]);
  }

  if (expired.length > 0) {
    logger.info({ count: expired.length }, "Released expired PENDING_PAYMENT bookings");
  }
  return expired.length;
}
