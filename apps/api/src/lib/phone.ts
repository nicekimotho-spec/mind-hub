/**
 * Normalizes a Kenyan mobile number (already validated by the shared phoneSchema) to
 * canonical +254 form, so lookups and uniqueness constraints never depend on which
 * format the client happened to submit.
 */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+254")) {
    return trimmed;
  }
  if (trimmed.startsWith("0")) {
    return `+254${trimmed.slice(1)}`;
  }
  throw new Error(`Cannot normalize phone number: ${raw}`);
}
