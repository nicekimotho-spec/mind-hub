import type { RequestHandler } from "express";
import { getPublicUserById } from "../auth/auth.service.js";
import { AuthError } from "../../lib/errors.js";

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
