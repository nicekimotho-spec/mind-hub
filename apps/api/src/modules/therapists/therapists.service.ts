import type {
  AddCredentialRequest,
  CreateSlotRequest,
  PublicSlot,
  PublicTherapist,
  TherapistDirectoryQuery,
  UpdateTherapistProfileRequest,
} from "@mind-hub/shared";
import { prisma } from "../../lib/db.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";

export function toPublicTherapist(profile: {
  userId: string;
  fullName: string;
  bio: string | null;
  specialties: string[];
  languages: string[];
  approach: string | null;
  feeKES: number;
}): PublicTherapist {
  return {
    userId: profile.userId,
    fullName: profile.fullName,
    bio: profile.bio,
    specialties: profile.specialties,
    languages: profile.languages,
    approach: profile.approach,
    feeKES: profile.feeKES,
  };
}

const DIRECTORY_PAGE_SIZE = 20;

export async function listActiveTherapists(query: TherapistDirectoryQuery): Promise<PublicTherapist[]> {
  const profiles = await prisma.therapistProfile.findMany({
    where: {
      status: "ACTIVE",
      ...(query.specialty ? { specialties: { has: query.specialty } } : {}),
      ...(query.language ? { languages: { has: query.language } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: DIRECTORY_PAGE_SIZE,
  });
  return profiles.map(toPublicTherapist);
}

/** Only ever returns a profile if it is ACTIVE — a pending/rejected/suspended
 * therapist's existence is not revealed to unauthenticated clients (see BUILD_PLAN.md §5). */
export async function getActiveTherapistById(userId: string): Promise<PublicTherapist> {
  const profile = await prisma.therapistProfile.findUnique({ where: { userId } });
  if (!profile || profile.status !== "ACTIVE") {
    throw new NotFoundError("Therapist not found");
  }
  return toPublicTherapist(profile);
}

export async function getOwnTherapistProfile(userId: string) {
  const profile = await prisma.therapistProfile.findUnique({
    where: { userId },
    include: { credentials: true },
  });
  if (!profile) {
    throw new NotFoundError("Therapist profile not found");
  }
  return profile;
}

export async function updateOwnTherapistProfile(userId: string, input: UpdateTherapistProfileRequest) {
  const existing = await prisma.therapistProfile.findUnique({ where: { userId } });
  if (!existing) {
    throw new NotFoundError("Therapist profile not found");
  }
  return prisma.therapistProfile.update({
    where: { userId },
    data: {
      bio: input.bio,
      specialties: input.specialties,
      languages: input.languages,
      approach: input.approach,
      feeKES: input.feeKES,
    },
  });
}

export async function addOwnCredential(userId: string, input: AddCredentialRequest) {
  const profile = await prisma.therapistProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new NotFoundError("Therapist profile not found");
  }
  return prisma.therapistCredential.create({
    data: {
      therapistId: userId,
      type: input.type,
      documentUrl: input.documentUrl,
    },
  });
}

function toPublicSlot(slot: { id: string; therapistId: string; startTime: Date; endTime: Date; isBooked: boolean }): PublicSlot {
  return {
    id: slot.id,
    therapistId: slot.therapistId,
    startTime: slot.startTime.toISOString(),
    endTime: slot.endTime.toISOString(),
    isBooked: slot.isBooked,
  };
}

/**
 * Application-level overlap check for a therapist's own schedule hygiene — not a
 * concurrency guard. Unlike booking (BUILD_PLAN.md §8.1), two different actors never
 * race to create the *same* slot here, so this doesn't need the atomic updateMany
 * pattern; the @@unique([therapistId, startTime]) constraint remains the DB-level
 * backstop against an exact-duplicate start time.
 */
export async function createOwnSlot(userId: string, input: CreateSlotRequest): Promise<PublicSlot> {
  const profile = await prisma.therapistProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new NotFoundError("Therapist profile not found");
  }

  const overlapping = await prisma.availabilitySlot.findFirst({
    where: {
      therapistId: userId,
      startTime: { lt: input.endTime },
      endTime: { gt: input.startTime },
    },
  });
  if (overlapping) {
    throw new ConflictError("This slot overlaps with an existing availability slot");
  }

  const slot = await prisma.availabilitySlot.create({
    data: { therapistId: userId, startTime: input.startTime, endTime: input.endTime },
  });
  return toPublicSlot(slot);
}

/** Only ever returns unbooked, future slots for an ACTIVE therapist (FR-CLI-06 /
 * BUILD_PLAN.md §5) — a client should never be shown a slot they can't actually book. */
export async function listPublicSlots(therapistId: string): Promise<PublicSlot[]> {
  const therapist = await prisma.therapistProfile.findUnique({ where: { userId: therapistId } });
  if (!therapist || therapist.status !== "ACTIVE") {
    throw new NotFoundError("Therapist not found");
  }

  const slots = await prisma.availabilitySlot.findMany({
    where: { therapistId, isBooked: false, startTime: { gt: new Date() } },
    orderBy: { startTime: "asc" },
  });
  return slots.map(toPublicSlot);
}

/** Unlike listPublicSlots, this is the therapist's own management view — every slot,
 * booked or not, past or future, so they can see their real schedule. */
export async function listOwnSlots(userId: string): Promise<PublicSlot[]> {
  const profile = await prisma.therapistProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new NotFoundError("Therapist profile not found");
  }
  const slots = await prisma.availabilitySlot.findMany({
    where: { therapistId: userId },
    orderBy: { startTime: "asc" },
  });
  return slots.map(toPublicSlot);
}
