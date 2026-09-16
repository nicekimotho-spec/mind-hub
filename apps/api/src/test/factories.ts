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
