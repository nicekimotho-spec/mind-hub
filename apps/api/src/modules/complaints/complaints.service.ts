import type { CreateComplaintRequest, UpdateComplaintRequest } from "@mind-hub/shared";
import { prisma } from "../../lib/db.js";
import { NotFoundError } from "../../lib/errors.js";

export async function createComplaint(userId: string, input: CreateComplaintRequest) {
  return prisma.complaint.create({ data: { userId, description: input.description } });
}

/** A user may only ever see their own complaint via the client-facing lookup — admin
 * review uses a separate, role-gated path (adminComplaints.service.ts). */
export async function getOwnComplaint(userId: string, complaintId: string) {
  const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
  if (!complaint || complaint.userId !== userId) {
    throw new NotFoundError("Complaint not found");
  }
  return complaint;
}

export async function listOwnComplaints(userId: string) {
  return prisma.complaint.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function updateComplaint(complaintId: string, input: UpdateComplaintRequest) {
  const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
  if (!complaint) {
    throw new NotFoundError("Complaint not found");
  }
  return prisma.complaint.update({
    where: { id: complaintId },
    data: { status: input.status, resolution: input.resolution },
  });
}
