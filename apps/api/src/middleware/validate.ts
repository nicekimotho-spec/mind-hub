import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { ValidationError } from "../lib/errors.js";

/**
 * Validates req.body against a Zod schema shared with the frontend (see @mind-hub/shared).
 * This is the server-side enforcement point referenced throughout the build plan: the
 * same rules run in the browser for fast feedback, but only this check is trusted.
 */
export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new ValidationError(result.error.flatten()));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateParams<T extends Record<string, string>>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(new ValidationError(result.error.flatten()));
      return;
    }
    req.params = result.data;
    next();
  };
}

/** Stores the parsed result on res.locals.query rather than reassigning req.query,
 * since req.query is derived from the raw querystring and best left untouched. */
export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(new ValidationError(result.error.flatten()));
      return;
    }
    res.locals["query"] = result.data;
    next();
  };
}
