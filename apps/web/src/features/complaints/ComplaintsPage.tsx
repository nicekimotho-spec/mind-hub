import { useState, type FormEvent } from "react";
import { createComplaintRequestSchema } from "@mind-hub/shared";
import { useCreateComplaint, useMyComplaints } from "./hooks";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { StatusBadge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { PageSpinner } from "../../components/Spinner";
import { TextareaField } from "../../components/fields";
import { ApiClientError } from "../../api/client";
import { formatDateTime } from "../../lib/format";

export function ComplaintsPage() {
  const { data, isLoading } = useMyComplaints();
  const createComplaint = useCreateComplaint();
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = createComplaintRequestSchema.safeParse({ description });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please add a bit more detail");
      return;
    }

    try {
      await createComplaint.mutateAsync(parsed.data);
      setDescription("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't submit your complaint right now.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Complaints"
        description="Something not right? Let us know and we'll look into it."
        action={!showForm && <Button onClick={() => setShowForm(true)}>File a complaint</Button>}
      />

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            <TextareaField
              id="description"
              label="What happened?"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {error && <Alert variant="error">{error}</Alert>}
            <div className="flex gap-2">
              <Button type="submit" isLoading={createComplaint.isPending}>
                Submit
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading && <PageSpinner label="Loading your complaints..." />}

      {data && data.complaints.length === 0 && !showForm && (
        <EmptyState title="No complaints filed" description="If something goes wrong, you can let us know here at any time." />
      )}

      {data && data.complaints.length > 0 && (
        <ul className="space-y-3">
          {data.complaints.map((complaint) => (
            <li key={complaint.id}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-stone-700">{complaint.description}</p>
                  <StatusBadge status={complaint.status} className="shrink-0" />
                </div>
                <p className="mt-2 text-xs text-stone-400">Filed {formatDateTime(complaint.createdAt)}</p>
                {complaint.resolution && (
                  <div className="mt-3 rounded-lg bg-stone-50 p-3 text-sm text-stone-600">
                    <span className="font-medium text-stone-900">Resolution: </span>
                    {complaint.resolution}
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
