import type { SwitchTherapistRequest } from "@mind-hub/shared";
import { prisma } from "../../lib/db.js";
import { AppError, BlockedByScreeningError, NotFoundError } from "../../lib/errors.js";
import { toPublicTherapists } from "../therapists/therapists.service.js";
import { assertCareRelationship } from "../careTeam/careTeam.service.js";

const MAX_MATCHES = 5;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Transparent, rules-based scoring — never a black-box model, and it never outputs a
 * diagnosis or treatment recommendation (FR-MAT-01/02). Score = specialty overlap
 * (weighted highest) + language overlap, tie-broken by lower fee then earlier signup.
 * The client always makes the final choice from the returned list.
 */
function scoreTherapist(
  therapist: { specialties: string[]; languages: string[] },
  concernTags: string[],
  clientLanguage: string | null,
): number {
  const normalizedSpecialties = new Set(therapist.specialties.map(normalize));
  const specialtyOverlap = concernTags.filter((tag) => normalizedSpecialties.has(normalize(tag))).length;

  const normalizedLanguages = new Set(therapist.languages.map(normalize));
  const languageMatch = clientLanguage && normalizedLanguages.has(normalize(clientLanguage)) ? 1 : 0;

  return specialtyOverlap * 3 + languageMatch * 2;
}

/** The top MAX_MATCHES ACTIVE therapists by score, leaving out `excludeIds`. */
async function rankActiveTherapists(concernTags: string[], clientLanguage: string | null, excludeIds: string[] = []) {
  const activeTherapists = await prisma.therapistProfile.findMany({
    where: { status: "ACTIVE", ...(excludeIds.length > 0 ? { userId: { notIn: excludeIds } } : {}) },
  });
  return activeTherapists
    .map((t) => ({ therapist: t, score: scoreTherapist(t, concernTags, clientLanguage) }))
    .sort((a, b) => b.score - a.score || a.therapist.feeKES - b.therapist.feeKES || a.therapist.createdAt.getTime() - b.therapist.createdAt.getTime())
    .slice(0, MAX_MATCHES);
}

export async function createMatch(clientId: string, intakeId: string) {
  const intake = await prisma.intakeAssessment.findUnique({ where: { id: intakeId } });
  if (!intake || intake.clientId !== clientId) {
    throw new NotFoundError("Intake assessment not found");
  }

  if (intake.blockedBooking) {
    throw new BlockedByScreeningError();
  }

  // Idempotent: a retried/double-submitted request returns the existing match rather
  // than erroring on the MatchResult.intakeId unique constraint or recomputing.
  const existing = await prisma.matchResult.findUnique({ where: { intakeId } });
  if (existing) {
    return hydrateMatch(existing);
  }

  const client = await prisma.clientProfile.findUnique({ where: { userId: clientId } });
  const ranked = await rankActiveTherapists(intake.concernTags, client?.preferredLanguage ?? null);

  const matchResult = await prisma.matchResult.create({
    data: {
      intakeId,
      therapistIds: ranked.map((r) => r.therapist.userId),
      criteriaSnapshot: {
        concernTags: intake.concernTags,
        preferredLanguage: client?.preferredLanguage ?? null,
        scores: ranked.map((r) => ({ therapistId: r.therapist.userId, score: r.score })),
      },
    },
  });

  return { matchResult, therapists: await toPublicTherapists(ranked.map((r) => r.therapist)) };
}

async function hydrateMatch(matchResult: { id: string; intakeId: string; therapistIds: string[]; createdAt: Date }) {
  const profiles = await prisma.therapistProfile.findMany({ where: { userId: { in: matchResult.therapistIds } } });
  const byId = new Map(profiles.map((p) => [p.userId, p]));
  // Preserve the originally ranked order — Prisma's `in` filter does not guarantee it.
  const ordered = matchResult.therapistIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => p !== undefined);
  return { matchResult, therapists: await toPublicTherapists(ordered) };
}

/**
 * FR-CLI-11: a client can ask for new matches at any time, without coercion. Matches
 * come from their latest intake, as at first matching, but leave out the therapist
 * they're switching from and anyone they've switched away from before — suggesting
 * someone the client already left would undercut the point of asking. Nothing is
 * cancelled automatically: upcoming bookings stay the client's decision.
 */
export async function switchTherapist(clientId: string, input: SwitchTherapistRequest) {
  await assertCareRelationship(clientId, input.fromTherapistId);

  const intake = await prisma.intakeAssessment.findFirst({ where: { clientId }, orderBy: { createdAt: "desc" } });
  if (!intake) {
    throw new AppError(409, "INTAKE_REQUIRED", "Answer a few quick questions first, so we can suggest therapists who fit.");
  }
  if (intake.blockedBooking) {
    throw new BlockedByScreeningError();
  }

  const previousSwitches = await prisma.therapistSwitch.findMany({ where: { clientId }, select: { fromTherapistId: true } });
  const excludeIds = [...new Set([input.fromTherapistId, ...previousSwitches.map((s) => s.fromTherapistId)])];

  const client = await prisma.clientProfile.findUnique({ where: { userId: clientId } });
  const ranked = await rankActiveTherapists(intake.concernTags, client?.preferredLanguage ?? null, excludeIds);

  const record = await prisma.therapistSwitch.create({
    data: {
      clientId,
      fromTherapistId: input.fromTherapistId,
      reason: input.reason,
      comment: input.comment,
      suggestedTherapistIds: ranked.map((r) => r.therapist.userId),
    },
  });

  return { switchId: record.id, therapists: await toPublicTherapists(ranked.map((r) => r.therapist)) };
}
