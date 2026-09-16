import { Router } from "express";
import { loginRequestSchema, refreshRequestSchema, registerRequestSchema, verifyOtpRequestSchema } from "@mind-hub/shared";
import { validateBody } from "../../middleware/validate.js";
import { authRateLimiter } from "../../middleware/rateLimit.js";
import * as controller from "./auth.controller.js";

export const authRoutes = Router();

authRoutes.post("/register", authRateLimiter, validateBody(registerRequestSchema), controller.register);

authRoutes.post("/verify-otp", authRateLimiter, validateBody(verifyOtpRequestSchema), controller.verifyOtp);

authRoutes.post("/login", authRateLimiter, validateBody(loginRequestSchema), controller.login);

authRoutes.post("/refresh", authRateLimiter, validateBody(refreshRequestSchema), controller.refresh);

authRoutes.post("/logout", validateBody(refreshRequestSchema), controller.logout);
