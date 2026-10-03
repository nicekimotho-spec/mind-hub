import { useState } from "react";
import { COMPLAINT_STATUSES, type ComplaintResponse, type ComplaintStatus } from "@mind-hub/shared";
import { useAdminComplaints, useUpdateComplaintAdmin } from "./hooks";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { StatusBadge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { PageSpinner } from "../../components/Spinner";
import { SelectField, TextareaField } from "../../components/fields";
import { ApiClientError } from "../../api/client";
import { formatDateTime } from "../../lib/format";

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  OPEN: "Open",
  IN_REVIEW: "In review",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

function ComplaintRow({ complaint }: { complaint: ComplaintResponse }) {
  const update = useUpdateComplaintAdmin();
  const [nextStatus, setNextStatus] = useState<ComplaintStatus>(complaint.status);
  const [resolution, setResolution] = useState(complaint.resolution ?? "");
  const needsResolution = nextStatus === "RESOLVED" || nextStatus === "CLOSED";

  async function handleSave() {
    await update.mutateAsync({
      id: complaint.id,
      input: { status: nextStatus, resolution: resolution || undefined },
    });
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-stone-700">{complaint.description}</p>
        <StatusBadge status={complaint.status} className="shrink-0" />
      </div>
      <p className="mt-1 text-xs text-stone-400">Filed {formatDateTime(complaint.createdAt)}</p>

      <div className="mt-4 space-y-3 border-t border-stone-200 pt-4">
        <div className="max-w-xs">
          <SelectField id={`status-${complaint.id}`} label="Update status" value={nextStatus} onChange={(e) => setNextStatus(e.target.value as ComplaintStatus)}>
            {COMPLAINT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </SelectField>
        </div>

        {needsResolution && (
          <TextareaField
            id={`resolution-${complaint.id}`}
            label="Resolution note"
            required
            rows={2}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          />
        )}

        {update.isError && (
          <Alert variant="error">{update.error instanceof ApiClientError ? update.error.message : "Couldn't save that update."}</Alert>
        )}

        <Button size="sm" isLoading={update.isPending} onClick={handleSave}>
          Save
        </Button>
      </div>
    </Card>
  );
}

export function AdminComplaintsPage() {
  const [status, setStatus] = useState<ComplaintStatus | "">("OPEN");
  const { data, isLoading, isError } = useAdminComplaints(status || undefined);

  return (
    <div>
      <PageHeader title="Complaints" description="Review and resolve complaints filed by clients and therapists." />

      <div className="mb-6 max-w-xs">
        <SelectField id="statusFilter" label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as ComplaintStatus)}>
          <option value="">All</option>
          {COMPLAINT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </SelectField>
      </div>

      {isLoading && <PageSpinner label="Loading complaints..." />}
      {isError && <Alert variant="error">Couldn&apos;t load complaints right now.</Alert>}

      {data && data.complaints.length === 0 && <EmptyState title="Nothing here" description="No complaints match this filter." />}

      {data && data.complaints.length > 0 && (
        <div className="space-y-4">
          {data.complaints.map((c) => (
            <ComplaintRow key={c.id} complaint={c} />
          ))}
        </div>
      )}
    </div>
  );
}
