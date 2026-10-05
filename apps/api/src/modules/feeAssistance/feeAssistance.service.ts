import type { FeeAssistanceApplication, FeeAssistanceStatus } from "@prisma/client";
import {
  FEE_ASSISTANCE_APPROVAL_MONTHS,
  type AdminFeeAssistanceApplication,
  type ApplyForFeeAssistanceRequest,
  type DecideFeeAssistanceRequest,
  type FeeAssistanceApplicationResponse,
  type IncomeBand,
  type MyFeeAssistanceResponse,
} from "@mind-hub/shared";
import { prisma } from "../../lib/db.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import { sendSms } from "../../lib/sms.js";
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";

function toResponse(application: FeeAssistanceApplication): FeeAssistanceApplicationResponse {
  return {
    id: application.id,
    incomeBand: application.incomeBand as IncomeBand,
    householdSize: application.householdSize,
    reason: application.reason,
    status: application.status,
    reviewNote: application.reviewNote,
    reviewedAt: application.reviewedAt?.toISOString() ?? null,
    expiresAt: application.expiresAt?.toISOString() ?? null,
    createdAt: application.createdAt.toISOString(),
  };
}

/** Whether a client currently pays reduced fees: they have an approval that hasn't expired. */
export async function isEligibleForReducedFees(clientId: string, at = new Date()): Promise<boolean> {
  const approval = await prisma.feeAssistanceApplication.findFirst({
    where: { clientId, status: "APPROVED", expiresAt: { gt: at } },
    select: { id: true },
  });
  return approval !== null;
}

export async function getMine(clientId: string): Promise<MyFeeAssistanceResponse> {
  const [latest, isEligible] = await Promise.all([
    prisma.feeAssistanceApplication.findFirst({ where: { clientId }, orderBy: { createdAt: "desc" } }),
    isEligibleForReducedFees(clientId),
  ]);
  return { application: latest ? toResponse(latest) : null, isEligible };
}

/** One open application at a time, and no new one while an approval is still running. */
export async function apply(clientId: string, input: ApplyForFeeAssistanceRequest): Promise<FeeAssistanceApplicationResponse> {
  const pending = await prisma.feeAssistanceApplication.findFirst({ where: { clientId, status: "PENDING" }, select: { id: true } });
  if (pending) {
    throw new ConflictError("You already have an application being reviewed");
  }
  if (await isEligibleForReducedFees(clientId)) {
    throw new ConflictError("You're already approved for reduced fees");
  }

  const application = await prisma.feeAssistanceApplication.create({
    data: { clientId, incomeBand: input.incomeBand, householdSize: input.householdSize ?? null, reason: input.reason },
  });
  return toResponse(application);
}

export async function listForAdmin(status?: FeeAssistanceStatus): Promise<AdminFeeAssistanceApplication[]> {
  const applications = await prisma.feeAssistanceApplication.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "asc" },
  });
  const clients = await prisma.clientProfile.findMany({
    where: { userId: { in: applications.map((a) => a.clientId) } },
    select: { userId: true, fullName: true },
  });
  const nameById = new Map(clients.map((c) => [c.userId, c.fullName]));
  return applications.map((a) => ({ ...toResponse(a), clientId: a.clientId, clientName: nameById.get(a.clientId) ?? "Unknown" }));
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export async function decide(adminId: string, id: string, input: DecideFeeAssistanceRequest): Promise<FeeAssistanceApplicationResponse> {
  const application = await prisma.feeAssistanceApplication.findUnique({ where: { id } });
  if (!application) {
    throw new NotFoundError("Application not found");
  }

  const now = new Date();
  // Guarded on PENDING so two admins deciding at once can't both win.
  const updated = await prisma.feeAssistanceApplication.updateMany({
    where: { id, status: "PENDING" },
    data: {
      status: input.decision,
      reviewedById: adminId,
      reviewedAt: now,
      reviewNote: input.note || null,
      expiresAt: input.decision === "APPROVED" ? addMonths(now, FEE_ASSISTANCE_APPROVAL_MONTHS) : null,
    },
  });
  if (updated.count === 0) {
    throw new ConflictError(`This application has already been ${application.status.toLowerCase()}`);
  }

  // Discreet like every other SMS: no mention of fees, income or therapy.
  const client = await prisma.user.findUnique({ where: { id: application.clientId }, select: { phone: true, smsNotificationsEnabled: true } });
  if (client?.smsNotificationsEnabled) {
    try {
      await sendSms(client.phone, `Mind Hub: there's an update on your application. Log in to see it: ${env.WEB_ORIGIN}/reduced-fees`);
    } catch (err) {
      logger.error({ err, applicationId: id }, "Failed to send fee assistance decision SMS");
    }
  }

  return toResponse(await prisma.feeAssistanceApplication.findUniqueOrThrow({ where: { id } }));
}
