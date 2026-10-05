import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SCALE_MAX, SCALE_MIN, getWorksheet, type WorksheetAnswers, type WorksheetScalePrompt } from "@mind-hub/shared";
import { useDeleteWorksheet, useUpdateWorksheet, useWorksheetResponse } from "./hooks";
import { ShareSelect } from "./ShareSelect";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { StatusBadge } from "../../components/Badge";
import { PageSpinner } from "../../components/Spinner";
import { TextareaField } from "../../components/fields";
import { ApiClientError } from "../../api/client";

const SCALE_POINTS = Array.from({ length: SCALE_MAX - SCALE_MIN + 1 }, (_, i) => SCALE_MIN + i);

function ScaleField({ prompt, value, onChange }: { prompt: WorksheetScalePrompt; value: number | undefined; onChange: (value: number) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-stone-700">{prompt.label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {SCALE_POINTS.map((point) => (
          <label
            key={point}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-stone-300 text-sm text-stone-700 has-[:checked]:border-brand-700 has-[:checked]:bg-brand-700 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500"
          >
            <input type="radio" name={prompt.id} value={point} checked={value === point} onChange={() => onChange(point)} className="sr-only" />
            {point}
          </label>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-stone-500" aria-hidden="true">
        <span>
          {SCALE_MIN} = {prompt.minLabel}
        </span>
        <span>
          {SCALE_MAX} = {prompt.maxLabel}
        </span>
      </div>
      <p className="sr-only">
        {SCALE_MIN} means {prompt.minLabel}, {SCALE_MAX} means {prompt.maxLabel}.
      </p>
    </fieldset>
  );
}

export function WorksheetPage() {
  const { responseId } = useParams<{ responseId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useWorksheetResponse(responseId);
  const update = useUpdateWorksheet(responseId ?? "");
  const deleteWorksheet = useDeleteWorksheet();
  const [answers, setAnswers] = useState<WorksheetAnswers>({});
  const [sharedWithTherapistId, setSharedWithTherapistId] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const response = data?.worksheet;
  useEffect(() => {
    if (!response) return;
    setAnswers(response.answers);
    setSharedWithTherapistId(response.sharedWithTherapistId);
  }, [response]);

  if (isLoading) return <PageSpinner label="Loading worksheet..." />;
  const worksheet = response && getWorksheet(response.worksheetSlug);
  if (isError || !response || !worksheet) return <Alert variant="error">This worksheet couldn&apos;t be found.</Alert>;

  async function save(complete: boolean) {
    setSavedMessage(null);
    try {
      await update.mutateAsync({ answers, sharedWithTherapistId, ...(complete ? { status: "COMPLETED" as const } : {}) });
      setSavedMessage(complete ? "Marked as complete. Well done for making the time." : "Saved.");
    } catch {
      // Surfaced below via update.isError.
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to=".." relative="path" className="text-sm font-medium text-brand-700 hover:underline">
        &larr; All worksheets
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium tracking-wide text-brand-700 uppercase">{worksheet.category}</p>
            <h2 className="mt-1 text-xl font-semibold text-stone-900">{worksheet.title}</h2>
          </div>
          <StatusBadge status={response.status} />
        </div>
        <p className="mt-3 text-sm text-stone-600">{worksheet.intro}</p>
        {response.assignedByName && (
          <div className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-900">
            <p className="font-medium">Added by {response.assignedByName}</p>
            {response.assignmentNote && <p className="mt-1 whitespace-pre-wrap">{response.assignmentNote}</p>}
          </div>
        )}
      </Card>

      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save(false);
          }}
          className="space-y-6"
        >
          {worksheet.prompts.map((prompt) =>
            prompt.kind === "scale" ? (
              <ScaleField
                key={prompt.id}
                prompt={prompt}
                value={typeof answers[prompt.id] === "number" ? (answers[prompt.id] as number) : undefined}
                onChange={(value) => setAnswers({ ...answers, [prompt.id]: value })}
              />
            ) : (
              <TextareaField
                key={prompt.id}
                id={`answer-${prompt.id}`}
                label={prompt.label}
                hint={prompt.hint}
                rows={3}
                maxLength={4000}
                value={typeof answers[prompt.id] === "string" ? (answers[prompt.id] as string) : ""}
                onChange={(e) => setAnswers({ ...answers, [prompt.id]: e.target.value })}
              />
            ),
          )}

          <div className="sm:max-w-xs">
            <ShareSelect id="worksheet-share" value={sharedWithTherapistId} onChange={setSharedWithTherapistId} />
          </div>

          {update.isError && (
            <Alert variant="error">{update.error instanceof ApiClientError ? update.error.message : "Couldn't save. Please try again."}</Alert>
          )}
          {savedMessage && <Alert variant="success">{savedMessage}</Alert>}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="secondary" isLoading={update.isPending && update.variables?.status === undefined}>
              Save
            </Button>
            {response.status !== "COMPLETED" && (
              <Button isLoading={update.isPending && update.variables?.status === "COMPLETED"} onClick={() => void save(true)}>
                Mark as complete
              </Button>
            )}
            <ConfirmDeleteButton
              itemLabel="worksheet"
              isPending={deleteWorksheet.isPending}
              onConfirm={() => deleteWorksheet.mutate(response.id, { onSuccess: () => navigate("..", { relative: "path" }) })}
            />
          </div>
        </form>
      </Card>
    </div>
  );
}
