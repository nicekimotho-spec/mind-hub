import { ValidationError } from "../../lib/errors.js";
import { hasCareRelationship } from "../careTeam/careTeam.service.js";

/**
 * Checks a requested share target. Undefined ("leave as is") and null ("only me") pass
 * through; a therapist id must be on the client's care team, so nothing can be shared
 * with a therapist the client has never had a paid session with.
 */
export async function checkShareTarget(clientId: string, target: string | null | undefined): Promise<void> {
  if (target === undefined || target === null) return;
  if (!(await hasCareRelationship(clientId, target))) {
    throw new ValidationError({
      formErrors: [],
      fieldErrors: { sharedWithTherapistId: ["You can only share with a therapist you've had a session with"] },
    });
  }
}
