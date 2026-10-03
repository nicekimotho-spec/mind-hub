import type { ZodError } from "zod";

/** Maps a ZodError's issues to a flat { fieldName: message } object, so forms can show
 * the error next to the specific field instead of one generic banner at the top. */
export function zodErrorsToFieldMap(error: ZodError): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !(key in map)) {
      map[key] = issue.message;
    }
  }
  return map;
}
