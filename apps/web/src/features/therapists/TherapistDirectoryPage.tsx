import { useState } from "react";
import { Link } from "react-router-dom";
import { CONCERN_TAGS } from "@mind-hub/shared";
import { useTherapists } from "./hooks";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { PageSpinner } from "../../components/Spinner";
import { Alert } from "../../components/Alert";
import { SelectField } from "../../components/fields";
import { formatKES } from "../../lib/format";

export function TherapistDirectoryPage() {
  const [specialty, setSpecialty] = useState("");
  const { data, isLoading, isError } = useTherapists({ specialty: specialty || undefined });

  return (
    <div>
      <PageHeader title="Find a therapist" description="Browse verified, licensed counsellors and pick who feels right for you." />

      <div className="mb-6 max-w-xs">
        <SelectField id="specialty" label="Filter by concern" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
          <option value="">All specialties</option>
          {CONCERN_TAGS.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </SelectField>
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
                    View profile
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
