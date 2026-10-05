import { useSearchParams } from "react-router-dom";
import { CONCERN_TAGS } from "@mind-hub/shared";
import { useTherapists } from "./hooks";
import { TherapistCard } from "./TherapistCard";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { PageSpinner } from "../../components/Spinner";
import { Alert } from "../../components/Alert";
import { CheckboxField, SelectField } from "../../components/fields";

export function TherapistDirectoryPage() {
  // The filter lives in the URL so landing-page links (and shared links) can open the
  // directory pre-filtered. Values outside CONCERN_TAGS are ignored, so a stale or
  // hand-edited link can't leave the select and the results disagreeing.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSpecialty = searchParams.get("specialty") ?? "";
  const specialty = (CONCERN_TAGS as readonly string[]).includes(requestedSpecialty) ? requestedSpecialty : "";
  const reducedFeeOnly = searchParams.get("reducedFee") === "true";

  function setFilter(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }
  const { data, isLoading, isError } = useTherapists({ specialty: specialty || undefined, reducedFee: reducedFeeOnly ? "true" : undefined });

  return (
    <div>
      <PageHeader title="Find a therapist" description="Browse verified, licensed counsellors and pick who feels right for you." />

      <div className="mb-6 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="w-full max-w-xs">
          <SelectField id="specialty" label="Filter by concern" value={specialty} onChange={(e) => setFilter("specialty", e.target.value || null)}>
            <option value="">All specialties</option>
            {CONCERN_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="pb-2">
          <CheckboxField
            id="reducedFee"
            label="Only therapists who offer reduced fees"
            checked={reducedFeeOnly}
            onChange={(e) => setFilter("reducedFee", e.target.checked ? "true" : null)}
          />
        </div>
      </div>

      {isLoading && <PageSpinner label="Loading therapists..." />}
      {isError && <Alert variant="error">Couldn&apos;t load therapists right now. Please try again shortly.</Alert>}

      {data && data.therapists.length === 0 && (
        <EmptyState title="No therapists match that filter" description="Try a different specialty, or view everyone." />
      )}

      {data && data.therapists.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.therapists.map((therapist) => (
            <li key={therapist.userId}>
              <TherapistCard therapist={therapist} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
