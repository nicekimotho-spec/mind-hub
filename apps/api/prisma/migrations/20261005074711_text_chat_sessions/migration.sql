-- AlterEnum
ALTER TYPE "SessionChannel" ADD VALUE 'CHAT';

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "sessionId" TEXT;

-- CreateIndex
CREATE INDEX "messages_sessionId_createdAt_idx" ON "messages"("sessionId", "createdAt");
