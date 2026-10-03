import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` },
  });
};

/** True for the SyntaxError express.json() passes to next() when the request body
 * isn't valid JSON — body-parser marks it with status 400 and this specific type,
 * distinguishing a malformed request (the client's fault, a 400) from a genuine
 * server bug (a 500). Without this check every bad request body surfaced as an
 * unhandled 500 INTERNAL_ERROR. */
function isJsonBodyParseError(err: unknown): err is SyntaxError & { status: number; type: string } {
  return (
    err instanceof SyntaxError &&
    "status" in err &&
    (err as { status?: unknown }).status === 400 &&
    "type" in err &&
    (err as { type?: unknown }).type === "entity.parse.failed"
  );
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err }, "unhandled app error");
    }
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (isJsonBodyParseError(err)) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Request body is not valid JSON" },
    });
    return;
  }

  logger.error({ err }, "unexpected error");
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
  });
};
