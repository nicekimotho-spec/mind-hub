import { afterAll, beforeEach } from "vitest";
import { prisma } from "../src/lib/db.js";
import { resetDatabase } from "./dbHelpers.js";

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
