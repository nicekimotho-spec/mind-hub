import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { WORKSHEETS, getWorksheet, type WorksheetResponseRecord, type WorksheetSlug } from "@mind-hub/shared";
import { useAssignWorksheet, useSharedByClient } from "./hooks";
import { MOOD_LABELS } from "./moods";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { StatusBadge } from "../../components/Badge";
import { PageSpinner } from "../../components/Spinner";
import { SelectField, TextareaField } from "../../components/fields";
import { ApiClientError } from "../../api/client";
import { formatDateTime } from "../../lib/format";

function AssignWorksheetForm({ clientId, clientName }: { clientId: string; clientName: string }) {
  const assign = useAssignWorksheet(clientId);
  const [worksheetSlug, setWorksheetSlug] = useState<WorksheetSlug>(WORKSHEETS[0].slug);
  const [note, setNote] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await assign.mutateAsync({ worksheetSlug, note: note.trim() || undefined });
      setNote("");
    } catch {
      // Surfaced below via assign.isError.
    }
  }

  return (
    <Card>
      <h2 className="font-medium text-stone-900">Suggest a worksheet</h2>
      <p className="mt-1 text-sm text-stone-500">
        It&apos;s added to {clientName}&apos;s toolkit and shared back with you, and they&apos;re sent a message about it.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <SelectField id="assign-worksheet" label="Worksheet" value={worksheetSlug} onChange={(e) => setWorksheetSlug(e.target.value as WorksheetSlug)}>
          {WORKSHEETS.map((w) => (
            <option key={w.slug} value={w.slug}>
              {w.title}
            </option>
          ))}
        </SelectField>
        <TextareaField id="assign-note" label="A note for your client (optional)" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        {assign.isError && (
          <Alert variant="error">{assign.error instanceof ApiClientError ? assign.error.message : "Couldn't add the worksheet."}</Alert>
        )}
        {assign.isSuccess && <Alert variant="success">Added, and {clientName} has been sent a message.</Alert>}
        <Button type="submit" isLoading={assign.isPending}>
          Add to their toolkit
        </Button>
      </form>
    </Card>
  );
}

function WorksheetAnswers({ response }: { response: WorksheetResponseRecord }) {
  const worksheet = getWorksheet(response.worksheetSlug);
  if (!worksheet) return null;
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-stone-900">{worksheet.title}</h3>
          <p className="text-xs text-stone-500">Updated {formatDateTime(response.updatedAt)}</p>
        </div>
        <StatusBadge status={response.status} />
      </div>
      <dl className="mt-3 space-y-3 text-sm">
        {worksheet.prompts.map((prompt) => {
          const answer = response.answers[prompt.id];
          return (
            <div key={prompt.id}>
              <dt className="font-medium text-stone-700">{prompt.label}</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-stone-600">
                {answer === undefined || answer === "" ? <span className="text-stone-500 italic">Not answered</span> : String(answer)}
                {prompt.kind === "scale" && typeof answer === "number" && <span className="text-stone-500"> / 10</span>}
              </dd>
            </div>
          );
        })}
      </dl>
    </Card>
  );
}

export function ClientSharedPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { data, isLoading, isError } = useSharedByClient(clientId);

  if (isLoading) return <PageSpinner label="Loading..." />;
  if (isError || !data || !clientId) return <Alert variant="error">This client couldn&apos;t be found.</Alert>;

  const { client, journalEntries, goals, worksheets } = data.shared;
  const nothingShared = journalEntries.length === 0 && goals.length === 0 && worksheets.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Shared by ${client.fullName}`}
        description={`Only what ${client.fullName} has chosen to share with you. Everything else in their toolkit stays private.`}
        action={
          <Link to={`/messages/${client.id}`} className="text-sm font-medium text-brand-700 hover:underline">
            Message {client.fullName}
          </Link>
        }
      />

      <AssignWorksheetForm clientId={clientId} clientName={client.fullName} />

      {nothingShared && <Alert variant="info">{client.fullName} hasn&apos;t shared anything with you yet.</Alert>}

      {goals.length > 0 && (
        <section aria-labelledby="shared-goals">
          <h2 id="shared-goals" className="mb-3 font-medium text-stone-900">
            Goals
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {goals.map((goal) => (
              <li key={goal.id}>
                <Card>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-stone-900">{goal.title}</p>
                    <StatusBadge status={goal.status} />
                  </div>
                  {goal.description && <p className="mt-1 text-sm text-stone-600">{goal.description}</p>}
                  <p className="mt-2 text-sm text-stone-500">{goal.progress}% of the way there</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {worksheets.length > 0 && (
        <section aria-labelledby="shared-worksheets" className="space-y-3">
          <h2 id="shared-worksheets" className="font-medium text-stone-900">
            Worksheets
          </h2>
          {worksheets.map((response) => (
            <WorksheetAnswers key={response.id} response={response} />
          ))}
        </section>
      )}

      {journalEntries.length > 0 && (
        <section aria-labelledby="shared-journal" className="space-y-3">
          <h2 id="shared-journal" className="font-medium text-stone-900">
            Journal entries
          </h2>
          {journalEntries.map((entry) => (
            <Card key={entry.id}>
              <p className="font-medium text-stone-900">{entry.title || formatDateTime(entry.createdAt)}</p>
              <p className="text-xs text-stone-500">
                {entry.title && `${formatDateTime(entry.createdAt)} · `}
                {entry.mood ? `Feeling: ${MOOD_LABELS[entry.mood]}` : "No mood recorded"}
              </p>
              <p className="mt-2 text-sm whitespace-pre-wrap text-stone-700">{entry.body}</p>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
