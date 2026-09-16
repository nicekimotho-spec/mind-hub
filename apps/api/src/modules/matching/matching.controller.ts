import type { RequestHandler } from "express";
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
