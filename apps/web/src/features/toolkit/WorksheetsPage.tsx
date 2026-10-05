import { Link, useNavigate } from "react-router-dom";
import { WORKSHEETS, getWorksheet } from "@mind-hub/shared";
import { useStartWorksheet, useWorksheetResponses } from "./hooks";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { StatusBadge } from "../../components/Badge";
import { PageSpinner } from "../../components/Spinner";
import { formatDateTime } from "../../lib/format";

export function WorksheetsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useWorksheetResponses();
  const startWorksheet = useStartWorksheet();

  async function start(slug: string) {
    const res = await startWorksheet.mutateAsync(slug);
    navigate(res.worksheet.id);
  }

  const responses = data?.worksheets ?? [];

  return (
    <div className="space-y-8">
      {isLoading && <PageSpinner label="Loading your worksheets..." />}

      {responses.length > 0 && (
        <section aria-labelledby="my-worksheets-heading">
          <h2 id="my-worksheets-heading" className="mb-3 font-medium text-stone-900">
            Your worksheets
          </h2>
          <ul className="space-y-2">
            {responses.map((response) => (
              <li key={response.id}>
                <Link to={response.id} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                  <Card className="flex flex-wrap items-center justify-between gap-3 transition-shadow hover:shadow-md">
                    <div>
                      <p className="font-medium text-stone-900">{getWorksheet(response.worksheetSlug)?.title ?? "Worksheet"}</p>
                      <p className="text-xs text-stone-500">
                        {response.assignedByName ? `From ${response.assignedByName} · ` : ""}
                        Updated {formatDateTime(response.updatedAt)}
                      </p>
                    </div>
                    <StatusBadge status={response.status} />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="library-heading">
        <h2 id="library-heading" className="font-medium text-stone-900">
          Worksheet library
        </h2>
        <p className="mt-1 mb-4 text-sm text-stone-500">Short, practical exercises you can do on your own or with your therapist.</p>
        {startWorksheet.isError && (
          <Alert variant="error" className="mb-4">
            Couldn&apos;t start that worksheet. Please try again.
          </Alert>
        )}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WORKSHEETS.map((worksheet) => (
            <li key={worksheet.slug}>
              <Card className="flex h-full flex-col">
                <p className="text-xs font-medium tracking-wide text-brand-700 uppercase">{worksheet.category}</p>
                <h3 className="mt-1 font-medium text-stone-900">{worksheet.title}</h3>
                <p className="mt-1 text-sm text-stone-500">{worksheet.summary}</p>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <span className="text-xs text-stone-500">About {worksheet.minutes} minutes</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    isLoading={startWorksheet.isPending && startWorksheet.variables === worksheet.slug}
                    onClick={() => void start(worksheet.slug)}
                    aria-label={`Start ${worksheet.title}`}
                  >
                    Start
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
