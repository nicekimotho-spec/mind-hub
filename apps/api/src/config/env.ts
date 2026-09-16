import { z } from "zod";

/**
 * Parsed and validated once at process startup. If a required variable is missing or
 * malformed, the process fails fast here instead of surfacing as a confusing runtime
 * error (or worse, an insecure default) later.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  WEB_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 characters"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  REDIS_URL: z.string().min(1).default("redis://localhost:6389"),
  BOOKING_HOLD_MINUTES: z.coerce.number().int().positive().default(15),
  CANCELLATION_WINDOW_HOURS: z.coerce.number().int().positive().default(24),
});

export const env = envSchema.parse(process.env);
export type Env = typeof env;
