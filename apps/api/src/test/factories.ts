import { prisma } from "../lib/db.js";
import { hashPassword } from "../lib/password.js";
import { signAccessToken } from "../lib/jwt.js";

let phoneCounter = 700_000_000;

/** Generates a unique, valid-looking Kenyan phone number per call within a test run. */
export function nextTestPhone(): string {
  phoneCounter += 1;
  return `+254${phoneCounter}`;
}

interface CreateTestUserOptions {
  phone?: string;
  fullName?: string;
}

export async function createTestUser(role: "CLIENT" | "THERAPIST" | "ADMIN" | "CLINICAL_DIRECTOR", options: CreateTestUserOptions = {}) {
  const phone = options.phone ?? nextTestPhone();
  const fullName = options.fullName ?? "Test User";
  const passwordHash = await hashPassword("irrelevant-password-1");

  const user = await prisma.user.create({
    data: {
      phone,
      passwordHash,
      role,
      phoneVerified: true,
      ...(role === "CLIENT"
        ? { clientProfile: { create: { fullName } } }
        : role === "THERAPIST"
          ? { therapistProfile: { create: { fullName, feeKES: 0, specialties: [], languages: [] } } }
          : {}),
    },
  });
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  return { user, accessToken };
}

/**
 * A client, an ACTIVE therapist, and one booking between them — by default CONFIRMED,
 * which is the minimum for a care relationship (modules/careTeam/careTeam.service.ts).
 */
export async function createCareRelationship(
  options: { status?: "PENDING_PAYMENT" | "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED"; startsInMs?: number; feeKES?: number } = {},
) {
  const client = await createTestUser("CLIENT", { fullName: "Amina Client" });
  const therapist = await createTestUser("THERAPIST", { fullName: "Brian Therapist" });
  await prisma.therapistProfile.update({
    where: { userId: therapist.user.id },
    data: { status: "ACTIVE", feeKES: options.feeKES ?? 2500 },
  });
  const startTime = new Date(Date.now() + (options.startsInMs ?? 2 * 60 * 60 * 1000));
  const slot = await prisma.availabilitySlot.create({
    data: { therapistId: therapist.user.id, startTime, endTime: new Date(startTime.getTime() + 60 * 60 * 1000), isBooked: true },
  });
  const booking = await prisma.booking.create({
    data: {
      clientId: client.user.id,
      therapistId: therapist.user.id,
      slotId: slot.id,
      status: options.status ?? "CONFIRMED",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  return { client, therapist, booking, slot };
}
