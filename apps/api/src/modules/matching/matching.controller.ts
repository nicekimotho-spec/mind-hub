import type { RequestHandler } from "express";
import type { SwitchTherapistRequest } from "@mind-hub/shared";
import { AuthError } from "../../lib/errors.js";
import { recordAuditLog } from "../../lib/auditLog.js";
import * as matchingService from "./matching.service.js";

export const createMatch: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const intakeId = req.params["intakeId"] as string;
    const { matchResult, therapists } = await matchingService.createMatch(req.user.id, intakeId);
    await recordAuditLog({
      actorId: req.user.id,
      action: "matching.create",
      resourceType: "MatchResult",
      resourceId: matchResult.id,
    });
    res.status(200).json({
      match: {
        id: matchResult.id,
        intakeId: matchResult.intakeId,
        therapists,
        createdAt: matchResult.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const switchTherapist: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const input = req.body as SwitchTherapistRequest;
    const result = await matchingService.switchTherapist(req.user.id, input);
    await recordAuditLog({
      actorId: req.user.id,
      action: "matching.switch_therapist",
      resourceType: "TherapistSwitch",
      resourceId: result.switchId,
      metadata: { reason: input.reason },
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
