import { prisma } from "../src/lib/db.js";

/** Deletes all rows in FK-safe order. Used between integration tests for isolation. */
export async function resetDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.message.deleteMany(),
    prisma.therapistSwitch.deleteMany(),
    prisma.journalEntry.deleteMany(),
    prisma.goal.deleteMany(),
    prisma.worksheetResponse.deleteMany(),
    prisma.feeAssistanceApplication.deleteMany(),
    prisma.giftRedemption.deleteMany(),
    prisma.giftVoucher.deleteMany(),
    prisma.auditLogEntry.deleteMany(),
    prisma.safeguardingIncident.deleteMany(),
    prisma.session.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.consentRecord.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.availabilitySlot.deleteMany(),
    prisma.matchResult.deleteMany(),
    prisma.intakeAssessment.deleteMany(),
    prisma.therapistCredential.deleteMany(),
    prisma.complaint.deleteMany(),
    prisma.otpCode.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.therapistProfile.deleteMany(),
    prisma.clientProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
