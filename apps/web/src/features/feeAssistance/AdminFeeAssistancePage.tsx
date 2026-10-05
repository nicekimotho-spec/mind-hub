import { useState } from "react";
import { FEE_ASSISTANCE_STATUSES, type AdminFeeAssistanceApplication, type FeeAssistanceStatus } from "@mind-hub/shared";
import { useDecideApplication, useFeeAssistanceApplications } from "./hooks";
import { INCOME_BAND_LABELS } from "./incomeBands";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { StatusBadge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { PageSpinner } from "../../components/Spinner";
import { SelectField, TextareaField } from "../../components/fields";
import { ApiClientError } from "../../api/client";
import { formatDateTime, formatStatusLabel } from "../../lib/format";

function ApplicationCard({ application }: { application: AdminFeeAssistanceApplication }) {
  const decide = useDecideApplication();
  const [note, setNote] = useState("");

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-medium text-stone-900">{application.clientName}</h2>
          <p className="text-xs text-stone-500">Applied {formatDateTime(application.createdAt)}</p>
        </div>
        <StatusBadge status={application.status} />
      </div>
      <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[10rem_1fr]">
        <dt className="text-stone-500">Income</dt>
        <dd className="text-stone-900">{INCOME_BAND_LABELS[application.incomeBand]}</dd>
        <dt className="text-stone-500">Household</dt>
        <dd className="text-stone-900">{application.householdSize ?? "Not given"}</dd>
        <dt className="text-stone-500">In their words</dt>
        <dd className="whitespace-pre-wrap text-stone-900">{application.reason}</dd>
        {application.reviewNote && (
          <>
            <dt className="text-stone-500">Review note</dt>
            <dd className="text-stone-900">{application.reviewNote}</dd>
          </>
        )}
      </dl>

      {application.status === "PENDING" && (
        <div className="mt-4 space-y-3 border-t border-stone-200 pt-4">
          <TextareaField
            id={`note-${application.id}`}
            label="Note to the client (optional)"
            hint="Shown to them with the decision."
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {decide.isError && (
            <Alert variant="error">{decide.error instanceof ApiClientError ? decide.error.message : "Couldn't save the decision."}</Alert>
          )}
          <div className="flex gap-3">
            <Button
              isLoading={decide.isPending && decide.variables?.input.decision === "APPROVED"}
              onClick={() => decide.mutate({ id: application.id, input: { decision: "APPROVED", note: note.trim() || undefined } })}
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              isLoading={decide.isPending && decide.variables?.input.decision === "DECLINED"}
              onClick={() => decide.mutate({ id: application.id, input: { decision: "DECLINED", note: note.trim() || undefined } })}
            >
              Decline
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function AdminFeeAssistancePage() {
  const [status, setStatus] = useState<FeeAssistanceStatus | "">("PENDING");
  const { data, isLoading } = useFeeAssistanceApplications(status || undefined);

  return (
    <div>
      <PageHeader title="Reduced-fee applications" description="Approvals last six months and apply with every therapist who offers a reduced fee." />
      <div className="mb-6 max-w-xs">
        <SelectField id="status-filter" label="Show" value={status} onChange={(e) => setStatus(e.target.value as FeeAssistanceStatus | "")}>
          {FEE_ASSISTANCE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {formatStatusLabel(s)}
            </option>
          ))}
          <option value="">All</option>
        </SelectField>
      </div>
      {isLoading && <PageSpinner label="Loading applications..." />}
      {data && data.applications.length === 0 && <EmptyState title="Nothing here" description="No applications match this filter." />}
      {data && data.applications.length > 0 && (
        <ul className="space-y-4">
          {data.applications.map((application) => (
            <li key={application.id}>
              <ApplicationCard application={application} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
