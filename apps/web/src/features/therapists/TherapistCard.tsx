import { Link } from "react-router-dom";
import type { PublicTherapist } from "@mind-hub/shared";
import { Card } from "../../components/Card";
import { Avatar } from "../../components/Avatar";
import { formatKES } from "../../lib/format";
import { RatingSummary, VerifiedBadge, experienceLabel } from "./TherapistMeta";

/** The summary card used wherever therapists are listed: directory, matches, switching. */
export function TherapistCard({ therapist, linkLabel = "View profile" }: { therapist: PublicTherapist; linkLabel?: string }) {
  const experience = experienceLabel(therapist.yearsExperience);
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start gap-3">
        <Avatar name={therapist.fullName} photoUrl={therapist.photoUrl} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="font-medium text-stone-900">{therapist.fullName}</h2>
            <VerifiedBadge />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <RatingSummary rating={therapist.rating} />
            {experience && <span className="text-sm text-stone-500">{experience}</span>}
          </div>
        </div>
      </div>
      {therapist.bio && <p className="mt-3 line-clamp-3 text-sm text-stone-500">{therapist.bio}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {therapist.specialties.slice(0, 3).map((s) => (
          <span key={s} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
            {s}
          </span>
        ))}
      </div>
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <span className="text-sm font-medium text-stone-700">
          {formatKES(therapist.feeKES)} / session
          {therapist.reducedFeeKES !== null && (
            <span className="block text-xs font-normal text-brand-700">Reduced fee available: {formatKES(therapist.reducedFeeKES)}</span>
          )}
        </span>
        <Link to={`/therapists/${therapist.userId}`} className="text-sm font-medium text-brand-700 hover:underline">
          {linkLabel}
        </Link>
      </div>
    </Card>
  );
}
