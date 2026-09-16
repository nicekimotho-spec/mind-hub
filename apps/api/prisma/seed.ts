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

  console.log({ admin: admin.id, client: client.id, therapist: therapist.id });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
