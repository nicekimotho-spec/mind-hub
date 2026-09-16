import { z } from "zod";
import { REGISTERABLE_ROLES, USER_ROLES } from "./roles.js";

/**
 * Accepts Kenyan mobile numbers in local (07xx/01xx) or international (+2547xx/+2541xx) form.
 * Backend normalizes to +254 form before persisting — see apps/api/src/lib/phone.ts.
 */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+254|0)(7|1)\d{8}$/, "Enter a valid Kenyan phone number, e.g. 0712345678");

export const emailSchema = z.string().trim().toLowerCase().email();

/**
 * Minimum 10 characters with at least one letter and one number. Deliberately does not
 * demand special characters — length is a stronger predictor of strength, and overly
 * strict composition rules push users toward predictable substitutions (e.g. "Password1!").
 */
export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128)
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const otpCodeSchema = z.string().regex(/^\d{6}$/, "OTP must be 6 digits");

export const registerRequestSchema = z.object({
  role: z.enum(REGISTERABLE_ROLES),
  phone: phoneSchema,
  email: emailSchema.optional(),
  password: passwordSchema,
  fullName: z.string().trim().min(2).max(120),
  dateOfBirth: z.coerce.date().optional(),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const verifyOtpRequestSchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
});
export type VerifyOtpRequest = z.infer<typeof verifyOtpRequestSchema>;

export const loginRequestSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Password is required"),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

export const publicUserSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(USER_ROLES),
  phone: z.string(),
  email: z.string().nullable(),
  status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]),
  phoneVerified: z.boolean(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export const loginResponseSchema = z.object({
  user: publicUserSchema,
  tokens: authTokensSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;
