import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : "info",
  redact: {
    paths: ["password", "*.password", "passwordHash", "*.passwordHash", "req.headers.authorization"],
    remove: true,
  },
});
