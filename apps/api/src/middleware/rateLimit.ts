import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

/**
 * Blunts credential-stuffing / OTP-brute-force attempts against auth endpoints.
 * The limit is effectively disabled under test: express-rate-limit's default store is
 * in-memory and persists for the lifetime of the process, so a full integration test
 * file firing dozens of legitimate requests at these routes would otherwise trip it —
 * that's a property of the test run, not something worth protecting against here.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === "test" ? 100_000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
});
