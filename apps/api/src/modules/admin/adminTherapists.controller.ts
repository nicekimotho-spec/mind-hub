import type { RequestHandler } from "express";
import type { RejectOrSuspendRequest, TherapistStatus } from "@mind-hub/shared";
import { AuthError } from "../../lib/errors.js";
import { recordAuditLog } from "../../lib/auditLog.js";
import * as adminTherapistsService from "./adminTherapists.service.js";

export const list: RequestHandler = async (_req, res, next) => {
  try {
    const query = res.locals["query"] as { status?: TherapistStatus };
    const therapists = await adminTherapistsService.listTherapistsForAdmin(query.status);
    res.status(200).json({ therapists });
  } catch (err) {
    next(err);
  }
};

export const verify: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const therapistId = req.params["id"] as string;
    const profile = await adminTherapistsService.verifyTherapist(req.user.id, therapistId);
    await recordAuditLog({
      actorId: req.user.id,
      action: "admin.therapist.verify",
      resourceType: "TherapistProfile",
      resourceId: profile.userId,
    });
    res.status(200).json({ profile });
  } catch (err) {
    next(err);
  }
};

export const reject: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const therapistId = req.params["id"] as string;
    const { reason } = req.body as RejectOrSuspendRequest;
    const profile = await adminTherapistsService.rejectTherapist(req.user.id, therapistId);
    await recordAuditLog({
      actorId: req.user.id,
      action: "admin.therapist.reject",
      resourceType: "TherapistProfile",
      resourceId: profile.userId,
      metadata: { reason },
    });
    res.status(200).json({ profile });
  } catch (err) {
    next(err);
  }
};

export const suspend: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const therapistId = req.params["id"] as string;
    const { reason } = req.body as RejectOrSuspendRequest;
    const profile = await adminTherapistsService.suspendTherapist(req.user.id, therapistId);
    await recordAuditLog({
      actorId: req.user.id,
      action: "admin.therapist.suspend",
      resourceType: "TherapistProfile",
      resourceId: profile.userId,
      metadata: { reason },
    });
    res.status(200).json({ profile });
  } catch (err) {
    next(err);
  }
};
