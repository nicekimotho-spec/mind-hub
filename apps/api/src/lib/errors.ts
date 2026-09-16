export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super(400, "VALIDATION_ERROR", "Request validation failed", details);
  }
}

export class AuthError extends AppError {
  constructor(message = "Invalid credentials") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, "FORBIDDEN", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(409, "CONFLICT", message);
  }
}

/** Raised when a request is blocked by a safety-screening flag (BUILD_PLAN.md §8.3) —
 * distinct from a generic validation failure so clients can route to emergency
 * resources instead of showing a normal form error. */
export class BlockedByScreeningError extends AppError {
  constructor(
    message = "This request is not available because of a safety screening flag. You will be connected to appropriate support instead of self-service booking.",
  ) {
    super(400, "BLOCKED_BY_SCREENING", message);
  }
}
