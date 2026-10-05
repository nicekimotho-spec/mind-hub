-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "reminderDaySentAt" TIMESTAMP(3),
ADD COLUMN     "reminderHourSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "smsNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
