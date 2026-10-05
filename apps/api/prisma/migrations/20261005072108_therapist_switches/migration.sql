-- CreateTable
CREATE TABLE "therapist_switches" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "fromTherapistId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "comment" TEXT,
    "suggestedTherapistIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "therapist_switches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "therapist_switches_clientId_idx" ON "therapist_switches"("clientId");

-- CreateIndex
CREATE INDEX "therapist_switches_fromTherapistId_idx" ON "therapist_switches"("fromTherapistId");
