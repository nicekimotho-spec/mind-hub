import type { RequestHandler } from "express";
import type { ComplaintStatus, UpdateComplaintRequest } from "@mind-hub/shared";
import { AuthError } from "../../lib/errors.js";
import { recordAuditLog } from "../../lib/auditLog.js";
import { prisma } from "../../lib/db.js";
import { NotFoundError } from "../../lib/errors.js";
import * as complaintsService from "../complaints/complaints.service.js";

export const list: RequestHandler = async (_req, res, next) => {
  try {
    const query = res.locals["query"] as { status?: ComplaintStatus };
    const complaints = await prisma.complaint.findMany({
      where: query.status ? { status: query.status } : {},
      orderBy: { createdAt: "asc" },
    });
    res.status(200).json({ complaints });
  } catch (err) {
    next(err);
  }
};

export const getById: RequestHandler = async (req, res, next) => {
  try {
    const complaint = await prisma.complaint.findUnique({ where: { id: req.params["id"] as string } });
    if (!complaint) throw new NotFoundError("Complaint not found");
    res.status(200).json({ complaint });
  } catch (err) {
    next(err);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const input = req.body as UpdateComplaintRequest;
    const complaint = await complaintsService.updateComplaint(req.params["id"] as string, input);
    await recordAuditLog({
      actorId: req.user.id,
      action: "admin.complaint.update",
      resourceType: "Complaint",
      resourceId: complaint.id,
      metadata: { status: complaint.status, resolution: complaint.resolution },
    });
    res.status(200).json({ complaint });
  } catch (err) {
    next(err);
  }
};
