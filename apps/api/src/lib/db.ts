import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across module reloads in dev (tsx watch) to avoid
// exhausting the Postgres connection pool by creating a fresh client on every reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
}
