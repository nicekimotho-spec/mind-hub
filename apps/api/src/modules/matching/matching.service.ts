import type { PublicTherapist } from "@mind-hub/shared";
import { prisma } from "../../lib/db.js";
import { BlockedByScreeningError, NotFoundError } from "../../lib/errors.js";
import { toPublicTherapist } from "../therapists/therapists.service.js";

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
  const activeTherapists = await prisma.therapistProfile.findMany({ where: { status: "ACTIVE" } });

  const ranked = activeTherapists
    .map((t) => ({ therapist: t, score: scoreTherapist(t, intake.concernTags, client?.preferredLanguage ?? null) }))
    .sort((a, b) => b.score - a.score || a.therapist.feeKES - b.therapist.feeKES || a.therapist.createdAt.getTime() - b.therapist.createdAt.getTime())
    .slice(0, MAX_MATCHES);

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

  return { matchResult, therapists: ranked.map((r) => toPublicTherapist(r.therapist)) };
}

async function hydrateMatch(matchResult: { id: string; intakeId: string; therapistIds: string[]; createdAt: Date }) {
  const profiles = await prisma.therapistProfile.findMany({ where: { userId: { in: matchResult.therapistIds } } });
  const byId = new Map(profiles.map((p) => [p.userId, p]));
  // Preserve the originally ranked order — Prisma's `in` filter does not guarantee it.
  const therapists: PublicTherapist[] = matchResult.therapistIds
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined)
    .map(toPublicTherapist);
  return { matchResult, therapists };
}
