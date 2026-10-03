import { prisma } from "../../lib/db.js";
import { NotFoundError } from "../../lib/errors.js";

/** The single source of truth for "what must a client agree to right now" — callers
 * never accept a client-supplied version id (BUILD_PLAN.md §2 — server-side is the
 * source of truth), which is also what makes the version-mismatch check in
 * sessions.service.ts meaningful: a client can only ever be recorded as consenting to
 * whatever this function currently returns. */
export async function getCurrentConsentVersion() {
  const version = await prisma.consentVersion.findFirst({
    where: { effectiveAt: { lte: new Date() } },
    orderBy: { version: "desc" },
  });
  if (!version) {
    throw new NotFoundError("No consent version is currently published");
  }
  return version;
}

/**
 * Records (or re-records) consent for a specific booking. ConsentRecord.bookingId is
 * unique, so re-consenting — e.g. because a new ConsentVersion was published after the
 * client's original consent (see sessions.service.ts's version-mismatch gate) — updates
 * the existing row in place rather than erroring on the unique constraint.
 */
export async function recordConsent(clientId: string, bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { consent: true } });
  if (!booking || booking.clientId !== clientId) {
    throw new NotFoundError("Booking not found");
  }

  const currentVersion = await getCurrentConsentVersion();

  if (booking.consent) {
    return prisma.consentRecord.update({
      where: { bookingId },
      data: { consentVersionId: currentVersion.id, acceptedAt: new Date() },
    });
  }

  return prisma.consentRecord.create({
    data: { bookingId, clientId, consentVersionId: currentVersion.id },
  });
}
