-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorksheetStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "mood" INTEGER,
    "sharedWithTherapistId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "sharedWithTherapistId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worksheet_responses" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "worksheetSlug" TEXT NOT NULL,
    "assignedById" TEXT,
    "assignmentNote" TEXT,
    "status" "WorksheetStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "answers" JSONB NOT NULL DEFAULT '{}',
    "sharedWithTherapistId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "worksheet_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "journal_entries_clientId_createdAt_idx" ON "journal_entries"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "journal_entries_sharedWithTherapistId_idx" ON "journal_entries"("sharedWithTherapistId");

-- CreateIndex
CREATE INDEX "goals_clientId_idx" ON "goals"("clientId");

-- CreateIndex
CREATE INDEX "goals_sharedWithTherapistId_idx" ON "goals"("sharedWithTherapistId");

-- CreateIndex
CREATE INDEX "worksheet_responses_clientId_idx" ON "worksheet_responses"("clientId");

-- CreateIndex
CREATE INDEX "worksheet_responses_sharedWithTherapistId_idx" ON "worksheet_responses"("sharedWithTherapistId");
