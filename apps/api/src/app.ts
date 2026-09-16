import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import { therapistsRoutes } from "./modules/therapists/therapists.routes.js";
import { adminTherapistsRoutes } from "./modules/admin/adminTherapists.routes.js";
import { intakeRoutes } from "./modules/intake/intake.routes.js";
import { matchingRoutes } from "./modules/matching/matching.routes.js";
import { bookingRoutes } from "./modules/booking/booking.routes.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp({ logger, autoLogging: env.NODE_ENV !== "test" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", usersRoutes);
  app.use("/api/v1/therapists", therapistsRoutes);
  app.use("/api/v1/admin/therapists", adminTherapistsRoutes);
  app.use("/api/v1/intake", intakeRoutes);
  app.use("/api/v1/matching", matchingRoutes);
  app.use("/api/v1/bookings", bookingRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
