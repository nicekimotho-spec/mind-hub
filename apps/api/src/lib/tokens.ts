import crypto from "node:crypto";

/** Opaque refresh token (not a JWT) — only its SHA-256 hash is ever persisted. */
export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
