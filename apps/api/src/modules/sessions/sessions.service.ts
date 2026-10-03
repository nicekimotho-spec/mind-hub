import type { SessionOutcome } from "@mind-hub/shared";
import { prisma } from "../../lib/db.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../../lib/errors.js";
import { getCurrentConsentVersion } from "../consent/consent.service.js";
import { createRoomToken } from "../../lib/videoProvider.js";
import { env } from "../../config/env.js";

/**
 * Full join-authorization matrix (BUILD_PLAN.md §8.5): ownership, booking status,
 * consent (including version-mismatch — a client who consented to an older
 * ConsentVersion than the one currently published must re-consent before joining), and
 * a time window. Every check that fails because the resource doesn't belong to the
 * caller returns 404 (never confirms the booking exists to a non-owner, per §8.6);
 * every check that fails because the action isn't allowed *yet* returns 403.
 */
export async function createOrGetJoinToken(actorId: string, actorRole: string, bookingId: string, channel?: "VIDEO" | "AUDIO") {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { slot: true, consent: true, session: true },
  });
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }
  const isOwnerClient = booking.clientId === actorId;
  const isOwnerTherapist = actorRole === "THERAPIST" && booking.therapistId === actorId;
  if (!isOwnerClient && !isOwnerTherapist) {
    throw new NotFoundError("Booking not found");
  }

  if (booking.status !== "CONFIRMED") {
    throw new ForbiddenError(`Session cannot be joined while the booking is ${booking.status}`);
  }

  if (!booking.consent) {
    throw new ForbiddenError("Informed consent has not been recorded for this booking yet");
  }
  const currentVersion = await getCurrentConsentVersion();
  if (booking.consent.consentVersionId !== currentVersion.id) {
    throw new ForbiddenError("Consent is out of date — please review and accept the current consent terms before joining");
  }

  const now = Date.now();
  const windowStart = booking.slot.startTime.getTime() - env.JOIN_WINDOW_MINUTES_BEFORE * 60_000;
  const windowEnd = booking.slot.endTime.getTime();
  if (now < windowStart || now > windowEnd) {
    throw new ForbiddenError("It is not yet time to join this session (or the session window has passed)");
  }

  const session =
    booking.session ??
    (await prisma.session.create({
      data: { bookingId, channel: channel ?? "VIDEO", status: "IN_PROGRESS", startedAt: new Date() },
    }));

  const roomToken = createRoomToken(session.id, actorId);
  return { sessionId: session.id, channel: session.channel, roomToken };
}

/** Only the assigned therapist may close out a session — a client cannot mark their
 * own session completed or as a no-show. */
export async function completeSession(therapistId: string, sessionId: string, outcome: SessionOutcome) {
  const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { booking: true } });
  if (!session || session.booking.therapistId !== therapistId) {
    throw new NotFoundError("Session not found");
  }
  if (session.status === "COMPLETED" || session.status === "CANCELLED") {
    throw new ConflictError(`Session cannot be completed from its current status (${session.status})`);
  }

  const bookingStatus = outcome === "COMPLETED" ? "COMPLETED" : "NO_SHOW";

  const [updatedSession] = await prisma.$transaction([
    prisma.session.update({ where: { id: sessionId }, data: { status: "COMPLETED", endedAt: new Date() } }),
    prisma.booking.update({ where: { id: session.bookingId }, data: { status: bookingStatus } }),
  ]);
  return updatedSession;
}
