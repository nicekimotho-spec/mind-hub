import type { IntakeRequest, RiskLevel, SafetyScreeningAnswers } from "@mind-hub/shared";
import { prisma } from "../../lib/db.js";
import { NotFoundError } from "../../lib/errors.js";

interface RiskAssessment {
  riskLevel: RiskLevel;
  blockedBooking: boolean;
}

/**
 * Pure, server-side-only risk computation — the client never sends riskLevel or
 * blockedBooking, only raw answers, so there is nothing for a client to spoof (see
 * BUILD_PLAN.md §8.3). This is a placeholder heuristic, not a validated clinical
 * instrument — see the comment on safetyScreeningAnswersSchema in @mind-hub/shared.
 */
export function computeRiskAssessment(answers: SafetyScreeningAnswers): RiskAssessment {
  if (answers.isInImmediateDanger) {
    return { riskLevel: "CRITICAL", blockedBooking: true };
  }
  if (answers.hasThoughtsOfSelfHarm && (answers.hasPlanOrIntent || answers.hasAccessToMeans)) {
    return { riskLevel: "CRITICAL", blockedBooking: true };
  }
  if (answers.hasThoughtsOfSelfHarm) {
    return { riskLevel: "ELEVATED", blockedBooking: false };
  }
  if (answers.hasAccessToMeans) {
    return { riskLevel: "LOW", blockedBooking: false };
  }
  return { riskLevel: "NONE", blockedBooking: false };
}

export async function createIntake(clientId: string, input: IntakeRequest) {
  const { riskLevel, blockedBooking } = computeRiskAssessment(input.safetyAnswers);

  return prisma.intakeAssessment.create({
    data: {
      clientId,
      presentingConcern: input.presentingConcern,
      concernTags: input.concernTags,
      preferredApproach: input.preferredApproach,
      preferredCommunicationMethod: input.preferredCommunicationMethod,
      previousCounsellingExperience: input.previousCounsellingExperience,
      availability: input.availability,
      safetyAnswers: input.safetyAnswers,
      riskLevel,
      blockedBooking,
    },
  });
}

/** Scoped to the requesting client — a non-owner gets the same 404 as a nonexistent
 * intake, never a 403, so existence isn't confirmed to a client that doesn't own it
 * (BUILD_PLAN.md §8.6). */
export async function getOwnIntakeById(clientId: string, intakeId: string) {
  const intake = await prisma.intakeAssessment.findUnique({ where: { id: intakeId } });
  if (!intake || intake.clientId !== clientId) {
    throw new NotFoundError("Intake assessment not found");
  }
  return intake;
}
