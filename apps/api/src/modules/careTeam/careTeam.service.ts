import type { BookingStatus } from "@prisma/client";
import type { CareTeamMember } from "@mind-hub/shared";
import { prisma } from "../../lib/db.js";
import { NotFoundError } from "../../lib/errors.js";

/**
 * A client and therapist have a care relationship once they share a paid booking, past
 * or upcoming. Messaging, shared journal entries, worksheets and switching all hang off
 * this one rule, so it lives here rather than being re-derived in each module. An unpaid
 * PENDING_PAYMENT hold doesn't count: nobody should be able to open a channel to a
 * therapist just by reserving a slot.
 */
const RELATIONSHIP_STATUSES: BookingStatus[] = ["CONFIRMED", "COMPLETED", "NO_SHOW"];

export async function hasCareRelationship(clientId: string, therapistId: string): Promise<boolean> {
  const booking = await prisma.booking.findFirst({
    where: { clientId, therapistId, status: { in: RELATIONSHIP_STATUSES } },
    select: { id: true },
  });
  return booking !== null;
}

/** Throws 404 (not 403) when there's no relationship, so the other person's existence
 * isn't confirmed to an unrelated user — the same rule as bookings (BUILD_PLAN.md §8.6). */
export async function assertCareRelationship(clientId: string, therapistId: string): Promise<void> {
  if (!(await hasCareRelationship(clientId, therapistId))) {
    throw new NotFoundError("Not found");
  }
}

/** Resolves (clientId, therapistId) for a conversation between the caller and someone
 * else, whichever side of the relationship the caller is on. */
export function pairFor(userId: string, role: string, counterpartId: string): { clientId: string; therapistId: string } {
  return role === "THERAPIST" ? { clientId: counterpartId, therapistId: userId } : { clientId: userId, therapistId: counterpartId };
}

/** A client's therapists, or a therapist's clients, most recently booked first. */
export async function listCareTeam(userId: string, role: string): Promise<CareTeamMember[]> {
  const isTherapist = role === "THERAPIST";
  const bookings = await prisma.booking.findMany({
    where: { ...(isTherapist ? { therapistId: userId } : { clientId: userId }), status: { in: RELATIONSHIP_STATUSES } },
    orderBy: { createdAt: "desc" },
    select: { clientId: true, therapistId: true },
  });
  const ids = [...new Set(bookings.map((b) => (isTherapist ? b.clientId : b.therapistId)))];
  if (ids.length === 0) return [];

  const profiles = isTherapist
    ? await prisma.clientProfile.findMany({ where: { userId: { in: ids } }, select: { userId: true, fullName: true } })
    : await prisma.therapistProfile.findMany({ where: { userId: { in: ids } }, select: { userId: true, fullName: true } });
  const nameById = new Map(profiles.map((p) => [p.userId, p.fullName]));
  return ids.map((id) => ({ id, fullName: nameById.get(id) ?? "Unknown" }));
}
