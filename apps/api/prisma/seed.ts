import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("dev-password-123", 10);

  const admin = await prisma.user.upsert({
    where: { phone: "+254700000001" },
    update: {},
    create: {
      phone: "+254700000001",
      email: "admin@mindhub.dev",
      passwordHash,
      role: "ADMIN",
      phoneVerified: true,
    },
  });

  const client = await prisma.user.upsert({
    where: { phone: "+254700000002" },
    update: {},
    create: {
      phone: "+254700000002",
      email: "client@mindhub.dev",
      passwordHash,
      role: "CLIENT",
      phoneVerified: true,
      clientProfile: { create: { fullName: "Demo Client" } },
    },
  });

  const therapist = await prisma.user.upsert({
    where: { phone: "+254700000003" },
    update: {},
    create: {
      phone: "+254700000003",
      email: "therapist@mindhub.dev",
      passwordHash,
      role: "THERAPIST",
      phoneVerified: true,
      therapistProfile: {
        create: {
          fullName: "Demo Therapist",
          status: "ACTIVE",
          bio: "Seeded therapist for local development.",
          specialties: ["Individual counselling", "Stress and anxiety management", "Grief and life transitions"],
          languages: ["English", "Kiswahili"],
          feeKES: 2500,
          verifiedAt: new Date(),
        },
      },
    },
  });

  // Applied on every run (unlike the create-only upserts above) so older dev databases
  // pick up profile fields added after they were first seeded.
  await prisma.therapistProfile.update({
    where: { userId: therapist.id },
    data: {
      specialties: ["Individual counselling", "Stress and anxiety management", "Grief and life transitions"],
      languages: ["English", "Kiswahili"],
      yearsExperience: 6,
      registrationNumber: "DEMO-0001",
      reducedFeeKES: 1000,
    },
  });

  // Keep three bookable slots open over the coming days, so the booking flow works out
  // of the box. Days that already have a 10:00 slot (booked or not) are skipped, since
  // a therapist can't have two slots starting at the same time.
  const openSlots = await prisma.availabilitySlot.count({
    where: { therapistId: therapist.id, isBooked: false, startTime: { gt: new Date() } },
  });
  for (let day = 1, added = 0; openSlots + added < 3 && day <= 60; day += 1) {
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + day);
    startTime.setHours(10, 0, 0, 0);
    const taken = await prisma.availabilitySlot.findUnique({
      where: { therapistId_startTime: { therapistId: therapist.id, startTime } },
    });
    if (taken) continue;
    await prisma.availabilitySlot.create({
      data: { therapistId: therapist.id, startTime, endTime: new Date(startTime.getTime() + 60 * 60 * 1000) },
    });
    added += 1;
  }

  const consentVersion = await prisma.consentVersion.upsert({
    where: { version: 1 },
    update: {},
    create: {
      version: 1,
      effectiveAt: new Date(),
      content: [
        "Online counselling at Mind Hub involves speaking with a licensed therapist over video or audio.",
        "It has real benefits but is not a substitute for in-person emergency or psychiatric care.",
        "What you share is confidential, within the legal and professional limits described in our privacy policy",
        "(for example, where disclosure is required to prevent serious harm or by law).",
        "Fees are shown before booking and are due before your session is confirmed.",
        "You can cancel or reschedule according to the cancellation policy shown at booking.",
        "If the technology fails during a session, your therapist will follow the fallback contact procedure",
        "you're shown before joining. In an emergency, contact local emergency services immediately —",
        "this platform is not a crisis response service.",
        "You can end therapy or file a complaint at any time without any obligation to continue.",
      ].join(" "),
    },
  });

  console.log({ admin: admin.id, client: client.id, therapist: therapist.id, consentVersion: consentVersion.id });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
