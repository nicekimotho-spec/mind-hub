import type { RequestHandler } from "express";
import type { IntakeRequest } from "@mind-hub/shared";
import { AuthError } from "../../lib/errors.js";
import { recordAuditLog } from "../../lib/auditLog.js";
import * as intakeService from "./intake.service.js";

export const create: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const input = req.body as IntakeRequest;
    const intake = await intakeService.createIntake(req.user.id, input);
    await recordAuditLog({
      actorId: req.user.id,
      action: "intake.create",
      resourceType: "IntakeAssessment",
      resourceId: intake.id,
      metadata: { riskLevel: intake.riskLevel, blockedBooking: intake.blockedBooking },
    });
    res.status(201).json({
      intake: {
        id: intake.id,
        riskLevel: intake.riskLevel,
        blockedBooking: intake.blockedBooking,
        createdAt: intake.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getById: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const intake = await intakeService.getOwnIntakeById(req.user.id, req.params["id"] as string);
    res.status(200).json({ intake });
  } catch (err) {
    next(err);
  }
};
