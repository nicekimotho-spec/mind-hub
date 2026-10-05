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
import { paymentsRoutes } from "./modules/payments/payments.routes.js";
import { consentRoutes } from "./modules/consent/consent.routes.js";
import { sessionsRoutes } from "./modules/sessions/sessions.routes.js";
import { complaintsRoutes } from "./modules/complaints/complaints.routes.js";
import { adminComplaintsRoutes } from "./modules/admin/adminComplaints.routes.js";
import { adminReportsRoutes } from "./modules/admin/adminReports.routes.js";
import { careTeamRoutes } from "./modules/careTeam/careTeam.routes.js";
import { messagesRoutes } from "./modules/messages/messages.routes.js";
import { clientsRoutes, goalsRoutes, journalRoutes, worksheetsRoutes } from "./modules/toolkit/toolkit.routes.js";
import { adminFeeAssistanceRoutes, feeAssistanceRoutes } from "./modules/feeAssistance/feeAssistance.routes.js";
import { giftsRoutes } from "./modules/gifts/gifts.routes.js";
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
  app.use("/api/v1/payments", paymentsRoutes);
  app.use("/api/v1/consent", consentRoutes);
  app.use("/api/v1/sessions", sessionsRoutes);
  app.use("/api/v1/complaints", complaintsRoutes);
  app.use("/api/v1/admin/complaints", adminComplaintsRoutes);
  app.use("/api/v1/admin/reports", adminReportsRoutes);
  app.use("/api/v1/care-team", careTeamRoutes);
  app.use("/api/v1/messages", messagesRoutes);
  app.use("/api/v1/journal", journalRoutes);
  app.use("/api/v1/goals", goalsRoutes);
  app.use("/api/v1/worksheets", worksheetsRoutes);
  app.use("/api/v1/clients", clientsRoutes);
  app.use("/api/v1/fee-assistance", feeAssistanceRoutes);
  app.use("/api/v1/admin/fee-assistance", adminFeeAssistanceRoutes);
  app.use("/api/v1/gifts", giftsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
