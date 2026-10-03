import type { RequestHandler } from "express";
import type { CompleteSessionRequest } from "@mind-hub/shared";
import { AuthError } from "../../lib/errors.js";
import { recordAuditLog } from "../../lib/auditLog.js";
import * as sessionsService from "./sessions.service.js";

export const complete: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const sessionId = req.params["id"] as string;
    const { outcome } = req.body as CompleteSessionRequest;
    const session = await sessionsService.completeSession(req.user.id, sessionId, outcome);
    await recordAuditLog({
      actorId: req.user.id,
      action: "session.complete",
      resourceType: "Session",
      resourceId: session.id,
      metadata: { outcome },
    });
    res.status(200).json({ session });
  } catch (err) {
    next(err);
  }
};
