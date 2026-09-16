import type { RequestHandler } from "express";
import type { LoginRequest, RefreshRequest, RegisterRequest, VerifyOtpRequest } from "@mind-hub/shared";
import { recordAuditLog } from "../../lib/auditLog.js";
import * as authService from "./auth.service.js";

// req.body has already been parsed + replaced by the shared Zod schema in validateBody
// middleware (see auth.routes.ts) — these casts reflect that guarantee, not a bypass of it.

export const register: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as RegisterRequest;
    const result = await authService.registerUser(input);
    await recordAuditLog({ actorId: result.userId, action: "auth.register", resourceType: "User", resourceId: result.userId });
    res.status(201).json({
      userId: result.userId,
      message: "Registered. Verify your phone using the OTP sent to you.",
    });
  } catch (err) {
    next(err);
  }
};

export const verifyOtp: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as VerifyOtpRequest;
    const result = await authService.verifyOtp(input.phone, input.code);
    await recordAuditLog({ actorId: result.userId, action: "auth.verify_otp", resourceType: "User", resourceId: result.userId });
    res.status(200).json({ message: "Phone verified" });
  } catch (err) {
    next(err);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as LoginRequest;
    const result = await authService.login(input.phone, input.password);
    await recordAuditLog({ actorId: result.user.id, action: "auth.login", resourceType: "User", resourceId: result.user.id });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as RefreshRequest;
    const result = await authService.refreshTokens(input.refreshToken);
    res.status(200).json({ tokens: result.tokens });
  } catch (err) {
    next(err);
  }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as RefreshRequest;
    await authService.logout(input.refreshToken);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
