import type { PublicTherapist } from "@mind-hub/shared";
import { ShieldCheckIcon, StarIcon } from "../../components/icons";

/** "★ 4.6 (12 ratings)" — renders nothing until the API supplies a rating, which it
 * only does past MIN_RATINGS_TO_DISPLAY. */
export function RatingSummary({ rating }: { rating: PublicTherapist["rating"] }) {
  if (!rating) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm text-stone-700">
      <StarIcon className="h-4 w-4 fill-accent-400 text-accent-500" />
      <span aria-hidden="true">
        {rating.average.toFixed(1)} <span className="text-stone-500">({rating.count} ratings)</span>
      </span>
      <span className="sr-only">
        Rated {rating.average.toFixed(1)} out of 5 from {rating.count} ratings
      </span>
    </span>
  );
}

/** Only ACTIVE therapists are ever public, and they're verified before activation —
 * so every listed therapist gets the badge; the date says since when. */
export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">
      <ShieldCheckIcon className="h-3.5 w-3.5" />
      Verified
    </span>
  );
}

export function experienceLabel(years: number | null): string | null {
  if (years === null) return null;
  if (years < 1) return "Less than a year of experience";
  return `${years} ${years === 1 ? "year" : "years"} of experience`;
}
