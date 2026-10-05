-- CreateEnum
CREATE TYPE "GiftVoucherStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'USED_UP', 'PAYMENT_FAILED');

-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'GIFT';

-- CreateTable
CREATE TABLE "gift_vouchers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purchaserId" TEXT NOT NULL,
    "amountKES" INTEGER NOT NULL,
    "balanceKES" INTEGER NOT NULL DEFAULT 0,
    "recipientName" TEXT,
    "recipientPhone" TEXT,
    "message" TEXT,
    "status" "GiftVoucherStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "idempotencyKey" TEXT NOT NULL,
    "providerReference" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_redemptions" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amountKES" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gift_vouchers_code_key" ON "gift_vouchers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "gift_vouchers_idempotencyKey_key" ON "gift_vouchers"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "gift_vouchers_providerReference_key" ON "gift_vouchers"("providerReference");

-- CreateIndex
CREATE INDEX "gift_vouchers_purchaserId_idx" ON "gift_vouchers"("purchaserId");

-- CreateIndex
CREATE UNIQUE INDEX "gift_redemptions_bookingId_key" ON "gift_redemptions"("bookingId");

-- CreateIndex
CREATE INDEX "gift_redemptions_voucherId_idx" ON "gift_redemptions"("voucherId");

-- AddForeignKey
ALTER TABLE "gift_redemptions" ADD CONSTRAINT "gift_redemptions_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "gift_vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
