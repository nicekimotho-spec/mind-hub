-- AlterTable
ALTER TABLE "intake_assessments" ADD COLUMN     "concernTags" TEXT[],
ADD COLUMN     "preferredCommunicationMethod" TEXT,
ADD COLUMN     "previousCounsellingExperience" BOOLEAN;
