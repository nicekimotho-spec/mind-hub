-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "riskFlagged" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_clientId_therapistId_createdAt_idx" ON "messages"("clientId", "therapistId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_therapistId_clientId_createdAt_idx" ON "messages"("therapistId", "clientId", "createdAt");
