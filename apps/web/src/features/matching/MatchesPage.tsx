import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useCreateMatch } from "./hooks";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/Card";
import { PageSpinner } from "../../components/Spinner";
import { Alert } from "../../components/Alert";
import { EmptyState } from "../../components/EmptyState";
import { ApiClientError } from "../../api/client";
import { formatKES } from "../../lib/format";

export function MatchesPage() {
  const { id } = useParams<{ id: string }>();
  const createMatch = useCreateMatch();
  const { mutate: triggerMatch } = createMatch; // TanStack Query keeps `mutate` referentially stable, so depending on it (not the whole mutation object, which is new every render) is both correct and satisfies exhaustive-deps without re-running on every render.

  useEffect(() => {
    if (id) {
      triggerMatch(id);
    }
  }, [id, triggerMatch]);

  return (
    <div>
      <PageHeader title="Your matches" description="Based on what you told us, here are a few therapists who could be a good fit." />

      {createMatch.isPending && <PageSpinner label="Finding good matches..." />}

      {createMatch.isError && (
        <Alert variant="error">
          {createMatch.error instanceof ApiClientError ? createMatch.error.message : "Couldn't load matches right now."}
        </Alert>
      )}

      {createMatch.data && createMatch.data.match.therapists.length === 0 && (
        <EmptyState
          title="No matches right now"
          description="We don't have an available therapist matching your preferences just yet. Try browsing the full directory instead."
          action={
            <Link to="/therapists" className="text-sm font-medium text-brand-700 hover:underline">
              Browse all therapists
            </Link>
          }
        />
      )}

      {createMatch.data && createMatch.data.match.therapists.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {createMatch.data.match.therapists.map((therapist) => (
            <li key={therapist.userId}>
              <Card className="h-full">
                <h2 className="font-medium text-stone-900">{therapist.fullName}</h2>
                {therapist.bio && <p className="mt-1 line-clamp-3 text-sm text-stone-500">{therapist.bio}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {therapist.specialties.slice(0, 3).map((s) => (
                    <span key={s} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-700">{formatKES(therapist.feeKES)} / session</span>
                  <Link to={`/therapists/${therapist.userId}`} className="text-sm font-medium text-brand-700 hover:underline">
                    View profile &amp; book
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
