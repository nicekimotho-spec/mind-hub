import type { RequestHandler } from "express";
import type { CreateComplaintRequest } from "@mind-hub/shared";
import { AuthError } from "../../lib/errors.js";
import { recordAuditLog } from "../../lib/auditLog.js";
import * as complaintsService from "./complaints.service.js";

export const create: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const input = req.body as CreateComplaintRequest;
    const complaint = await complaintsService.createComplaint(req.user.id, input);
    await recordAuditLog({ actorId: req.user.id, action: "complaint.create", resourceType: "Complaint", resourceId: complaint.id });
    res.status(201).json({ complaint });
  } catch (err) {
    next(err);
  }
};

export const listMine: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const complaints = await complaintsService.listOwnComplaints(req.user.id);
    res.status(200).json({ complaints });
  } catch (err) {
    next(err);
  }
};

export const getMine: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const complaint = await complaintsService.getOwnComplaint(req.user.id, req.params["id"] as string);
    res.status(200).json({ complaint });
  } catch (err) {
    next(err);
  }
};
