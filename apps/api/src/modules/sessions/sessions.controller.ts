import type { RequestHandler } from "express";
import type { CompleteSessionRequest, SendMessageRequest } from "@mind-hub/shared";
import { AuthError } from "../../lib/errors.js";
import { recordAccessAuditLog, recordAuditLog } from "../../lib/auditLog.js";
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

export const getChat: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const sessionId = req.params["id"] as string;
    const chat = await sessionsService.getSessionChat(req.user.id, req.user.role, sessionId);
    await recordAccessAuditLog({ actorId: req.user.id, action: "session_chat.view", resourceType: "Session", resourceId: sessionId });
    res.status(200).json(chat);
  } catch (err) {
    next(err);
  }
};

export const sendChat: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const sessionId = req.params["id"] as string;
    const { body } = req.body as SendMessageRequest;
    const result = await sessionsService.sendSessionChatMessage(req.user.id, req.user.role, sessionId, body);
    await recordAuditLog({
      actorId: req.user.id,
      action: "session_chat.send",
      resourceType: "Message",
      resourceId: result.message.id,
      metadata: { sessionId, riskFlagged: result.message.riskFlagged },
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};
