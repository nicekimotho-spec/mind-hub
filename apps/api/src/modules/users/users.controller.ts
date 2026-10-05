import type { RequestHandler } from "express";
import type { NotificationPreferences } from "@mind-hub/shared";
import { getPublicUserById } from "../auth/auth.service.js";
import { AuthError } from "../../lib/errors.js";
import { recordAuditLog } from "../../lib/auditLog.js";
import * as usersService from "./users.service.js";

export const me: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AuthError("Not authenticated");
    }
    const user = await getPublicUserById(req.user.id);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

export const getPreferences: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const preferences = await usersService.getNotificationPreferences(req.user.id);
    res.status(200).json({ preferences });
  } catch (err) {
    next(err);
  }
};

export const updatePreferences: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const input = req.body as NotificationPreferences;
    const preferences = await usersService.updateNotificationPreferences(req.user.id, input);
    await recordAuditLog({
      actorId: req.user.id,
      action: "user.update_preferences",
      resourceType: "User",
      resourceId: req.user.id,
      metadata: preferences,
    });
    res.status(200).json({ preferences });
  } catch (err) {
    next(err);
  }
};
