import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useCreateMatch } from "./hooks";
import { TherapistCard } from "../therapists/TherapistCard";
import { PageHeader } from "../../components/PageHeader";
import { PageSpinner } from "../../components/Spinner";
import { Alert } from "../../components/Alert";
import { EmptyState } from "../../components/EmptyState";
import { ApiClientError } from "../../api/client";

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
              <TherapistCard therapist={therapist} linkLabel="View profile & book" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
