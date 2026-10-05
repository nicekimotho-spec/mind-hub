import type { RequestHandler } from "express";
import type { SendMessageRequest } from "@mind-hub/shared";
import { AuthError } from "../../lib/errors.js";
import { recordAccessAuditLog, recordAuditLog } from "../../lib/auditLog.js";
import * as messagesService from "./messages.service.js";

export const listThreads: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const threads = await messagesService.listThreads(req.user.id, req.user.role);
    res.status(200).json({ threads });
  } catch (err) {
    next(err);
  }
};

export const unreadCount: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const count = await messagesService.countUnread(req.user.id);
    res.status(200).json({ count });
  } catch (err) {
    next(err);
  }
};

export const getThread: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const counterpartId = req.params["counterpartId"] as string;
    const thread = await messagesService.getThread(req.user.id, req.user.role, counterpartId);
    await recordAccessAuditLog({ actorId: req.user.id, action: "message.thread_view", resourceType: "MessageThread", resourceId: counterpartId });
    res.status(200).json({ thread });
  } catch (err) {
    next(err);
  }
};

export const send: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const counterpartId = req.params["counterpartId"] as string;
    const { body } = req.body as SendMessageRequest;
    const result = await messagesService.sendMessage(req.user.id, req.user.role, counterpartId, body);
    await recordAuditLog({
      actorId: req.user.id,
      action: "message.send",
      resourceType: "Message",
      resourceId: result.message.id,
      metadata: { riskFlagged: result.message.riskFlagged },
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};
