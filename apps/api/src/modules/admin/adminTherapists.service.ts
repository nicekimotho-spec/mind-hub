import type { TherapistStatus } from "@mind-hub/shared";
import { prisma } from "../../lib/db.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";

export async function listTherapistsForAdmin(status?: TherapistStatus) {
  return prisma.therapistProfile.findMany({
    where: status ? { status } : {},
    include: {
      credentials: true,
      user: { select: { phone: true, email: true, phoneVerified: true, createdAt: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

async function requireTherapistInStatus(userId: string, expected: TherapistStatus) {
  const profile = await prisma.therapistProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new NotFoundError("Therapist not found");
  }
  if (profile.status !== expected) {
    throw new ConflictError(`Therapist is not in ${expected} status (currently ${profile.status})`);
  }
  return profile;
}

/**
 * Verification and activation are collapsed into a single MVP transition
 * (PENDING_VERIFICATION -> ACTIVE) — the schema keeps a distinct VERIFIED state for a
 * future, more granular onboarding workflow (e.g. a separate "ready to accept bookings"
 * step), but nothing in Phase 2 MVP scope needs that extra step yet.
 */
export async function verifyTherapist(adminId: string, therapistUserId: string) {
  await requireTherapistInStatus(therapistUserId, "PENDING_VERIFICATION");
  return prisma.therapistProfile.update({
    where: { userId: therapistUserId },
    data: { status: "ACTIVE", verifiedAt: new Date(), verifiedById: adminId },
  });
}

export async function rejectTherapist(_adminId: string, therapistUserId: string) {
  await requireTherapistInStatus(therapistUserId, "PENDING_VERIFICATION");
  return prisma.therapistProfile.update({
    where: { userId: therapistUserId },
    data: { status: "REJECTED" },
  });
}

export async function suspendTherapist(_adminId: string, therapistUserId: string) {
  const profile = await prisma.therapistProfile.findUnique({ where: { userId: therapistUserId } });
  if (!profile) {
    throw new NotFoundError("Therapist not found");
  }
  if (profile.status !== "ACTIVE" && profile.status !== "VERIFIED") {
    throw new ConflictError(`Only an active or verified therapist can be suspended (currently ${profile.status})`);
  }
  return prisma.therapistProfile.update({
    where: { userId: therapistUserId },
    data: { status: "SUSPENDED" },
  });
}
