import { useState, type FormEvent } from "react";
import { MOOD_LEVELS, journalEntryRequestSchema, type JournalEntryResponse } from "@mind-hub/shared";
import { useDeleteJournalEntry, useJournal, useSaveJournalEntry } from "./hooks";
import { ShareSelect, useShareLabel } from "./ShareSelect";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";
import { MOOD_LABELS } from "./moods";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { Badge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { PageSpinner } from "../../components/Spinner";
import { SelectField, TextField, TextareaField } from "../../components/fields";
import { zodErrorsToFieldMap } from "../../lib/zodErrors";
import { ApiClientError } from "../../api/client";
import { formatDateTime } from "../../lib/format";

interface Draft {
  id?: string;
  title: string;
  body: string;
  mood: string;
  sharedWithTherapistId: string | null;
}

const EMPTY_DRAFT: Draft = { title: "", body: "", mood: "", sharedWithTherapistId: null };

function EntryForm({ draft, setDraft, onDone }: { draft: Draft; setDraft: (draft: Draft) => void; onDone: () => void }) {
  const save = useSaveJournalEntry();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);
    const parsed = journalEntryRequestSchema.safeParse({
      title: draft.title || undefined,
      body: draft.body,
      mood: draft.mood ? Number(draft.mood) : undefined,
      sharedWithTherapistId: draft.sharedWithTherapistId,
    });
    if (!parsed.success) {
      setFieldErrors(zodErrorsToFieldMap(parsed.error));
      return;
    }
    try {
      await save.mutateAsync({ id: draft.id, input: parsed.data });
      onDone();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Couldn't save your entry. Please try again.");
    }
  }

  return (
    <Card>
      <h2 className="font-medium text-stone-900">{draft.id ? "Edit entry" : "New entry"}</h2>
      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="journal-title" label="Title (optional)" maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <SelectField id="journal-mood" label="How are you feeling? (optional)" value={draft.mood} onChange={(e) => setDraft({ ...draft, mood: e.target.value })}>
            <option value="">Prefer not to say</option>
            {MOOD_LEVELS.map((level) => (
              <option key={level} value={level}>
                {MOOD_LABELS[level]}
              </option>
            ))}
          </SelectField>
        </div>
        <TextareaField
          id="journal-body"
          label="What's on your mind?"
          rows={6}
          value={draft.body}
          onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          error={fieldErrors["body"]}
        />
        <div className="sm:max-w-xs">
          <ShareSelect id="journal-share" value={draft.sharedWithTherapistId} onChange={(value) => setDraft({ ...draft, sharedWithTherapistId: value })} />
        </div>
        {formError && <Alert variant="error">{formError}</Alert>}
        <div className="flex gap-3">
          <Button type="submit" isLoading={save.isPending}>
            {draft.id ? "Save changes" : "Save entry"}
          </Button>
          {draft.id && (
            <Button variant="secondary" onClick={onDone}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

function EntryCard({ entry, onEdit }: { entry: JournalEntryResponse; onEdit: () => void }) {
  const deleteEntry = useDeleteJournalEntry();
  const shareLabel = useShareLabel();
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-stone-900">{entry.title || formatDateTime(entry.createdAt)}</h3>
          <p className="text-xs text-stone-500">
            {entry.title && `${formatDateTime(entry.createdAt)} · `}
            {entry.mood ? `Feeling: ${MOOD_LABELS[entry.mood]}` : "No mood recorded"}
          </p>
        </div>
        <Badge tone={entry.sharedWithTherapistId ? "info" : "neutral"}>{shareLabel(entry.sharedWithTherapistId)}</Badge>
      </div>
      <p className="mt-3 text-sm whitespace-pre-wrap text-stone-700">{entry.body}</p>
      <div className="mt-3 flex gap-2">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <ConfirmDeleteButton itemLabel="entry" isPending={deleteEntry.isPending} onConfirm={() => deleteEntry.mutate(entry.id)} />
      </div>
    </Card>
  );
}

export function JournalPage() {
  const { data, isLoading } = useJournal();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  function edit(entry: JournalEntryResponse) {
    setDraft({
      id: entry.id,
      title: entry.title ?? "",
      body: entry.body,
      mood: entry.mood ? String(entry.mood) : "",
      sharedWithTherapistId: entry.sharedWithTherapistId,
    });
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="space-y-6">
      <EntryForm key={draft.id ?? "new"} draft={draft} setDraft={setDraft} onDone={() => setDraft(EMPTY_DRAFT)} />

      {isLoading && <PageSpinner label="Loading your journal..." />}
      {data && data.entries.length === 0 && (
        <EmptyState title="No entries yet" description="Writing things down, even briefly, can help you notice patterns and bring them to your sessions." />
      )}
      {data && data.entries.length > 0 && (
        <ul className="space-y-4">
          {data.entries.map((entry) => (
            <li key={entry.id}>
              <EntryCard entry={entry} onEdit={() => edit(entry)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
