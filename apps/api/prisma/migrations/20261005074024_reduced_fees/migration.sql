-- CreateEnum
CREATE TYPE "FeeAssistanceStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "feeKES" INTEGER,
ADD COLUMN     "reducedFee" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "therapist_profiles" ADD COLUMN     "reducedFeeKES" INTEGER;

-- CreateTable
CREATE TABLE "fee_assistance_applications" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "incomeBand" TEXT NOT NULL,
    "householdSize" INTEGER,
    "reason" TEXT NOT NULL,
    "status" "FeeAssistanceStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_assistance_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fee_assistance_applications_clientId_createdAt_idx" ON "fee_assistance_applications"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "fee_assistance_applications_status_idx" ON "fee_assistance_applications"("status");
