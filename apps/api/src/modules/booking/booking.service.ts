import type { BookingDetail, CreateBookingRequest } from "@mind-hub/shared";
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

type BookingForHydration = Awaited<ReturnType<typeof prisma.booking.findFirstOrThrow<{
  include: { slot: true; payment: true; consent: true; session: true; feedback: true };
}>>>;

/**
 * Booking.clientId/therapistId are plain fields, not Prisma relations (see
 * schema.prisma), so names have to be joined here rather than via `include` — batched
 * to avoid an N+1 query per row when hydrating a list.
 */
async function hydrateBookings(bookings: BookingForHydration[]): Promise<BookingDetail[]> {
  const clientIds = [...new Set(bookings.map((b) => b.clientId))];
  const therapistIds = [...new Set(bookings.map((b) => b.therapistId))];

  const [clients, therapists] = await Promise.all([
    prisma.clientProfile.findMany({ where: { userId: { in: clientIds } } }),
    prisma.therapistProfile.findMany({ where: { userId: { in: therapistIds } } }),
  ]);
  const clientById = new Map(clients.map((c) => [c.userId, c]));
  const therapistById = new Map(therapists.map((t) => [t.userId, t]));

  return bookings.map((b) => ({
    id: b.id,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
    expiresAt: b.expiresAt.toISOString(),
    slot: { id: b.slot.id, startTime: b.slot.startTime.toISOString(), endTime: b.slot.endTime.toISOString() },
    clientId: b.clientId,
    clientName: clientById.get(b.clientId)?.fullName ?? "Unknown",
    therapistId: b.therapistId,
    therapistName: therapistById.get(b.therapistId)?.fullName ?? "Unknown",
    feeKES: therapistById.get(b.therapistId)?.feeKES ?? 0,
    paymentStatus: b.payment?.status ?? null,
    hasConsented: b.consent != null,
    sessionId: b.session?.id ?? null,
    sessionStatus: b.session?.status ?? null,
    hasFeedback: b.feedback != null,
  }));
}

export async function listOwnBookings(userId: string, role: string): Promise<BookingDetail[]> {
  const bookings = await prisma.booking.findMany({
    where: role === "THERAPIST" ? { therapistId: userId } : { clientId: userId },
    include: { slot: true, payment: true, consent: true, session: true, feedback: true },
    orderBy: { createdAt: "desc" },
  });
  return hydrateBookings(bookings);
}

/** Same ownership rule as every other booking action (BUILD_PLAN.md §8.6): a non-owner
 * gets 404, never a glimpse of the booking's existence via a 403. */
export async function getOwnBookingDetail(userId: string, role: string, bookingId: string): Promise<BookingDetail> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { slot: true, payment: true, consent: true, session: true, feedback: true },
  });
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }
  const isOwnerClient = booking.clientId === userId;
  const isOwnerTherapist = role === "THERAPIST" && booking.therapistId === userId;
  if (!isOwnerClient && !isOwnerTherapist) {
    throw new NotFoundError("Booking not found");
  }
  const [detail] = await hydrateBookings([booking]);
  if (!detail) {
    throw new NotFoundError("Booking not found");
  }
  return detail;
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
