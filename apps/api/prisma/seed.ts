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
          specialties: ["Stress and anxiety", "Grief and life transitions"],
          languages: ["en", "sw"],
          feeKES: 2500,
          verifiedAt: new Date(),
        },
      },
    },
  });

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
