import { useState } from "react";
import type { TherapistStatus } from "@mind-hub/shared";
import { THERAPIST_STATUSES } from "@mind-hub/shared";
import { useAdminTherapists, useRejectTherapist, useSuspendTherapist, useVerifyTherapist } from "./hooks";
import type { AdminTherapistRecord } from "./api";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { StatusBadge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { PageSpinner } from "../../components/Spinner";
import { SelectField, TextareaField } from "../../components/fields";
import { Modal } from "../../components/Modal";
import { ApiClientError } from "../../api/client";
import { formatDateTime, formatKES } from "../../lib/format";

const STATUS_FILTER_LABELS: Record<TherapistStatus, string> = {
  PENDING_VERIFICATION: "Pending verification",
  VERIFIED: "Verified",
  ACTIVE: "Active",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
};

function ReasonModal({
  open,
  title,
  onClose,
  onConfirm,
  isLoading,
  error,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
  error: string | null;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <TextareaField id="reason" label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
      {error && (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" isLoading={isLoading} onClick={() => onConfirm(reason)}>
          Confirm
        </Button>
      </div>
    </Modal>
  );
}

function TherapistRow({ therapist }: { therapist: AdminTherapistRecord }) {
  const verify = useVerifyTherapist();
  const reject = useRejectTherapist();
  const suspend = useSuspendTherapist();
  const [modal, setModal] = useState<"reject" | "suspend" | null>(null);

  const actionError =
    (verify.error instanceof ApiClientError && verify.error.message) ||
    (reject.error instanceof ApiClientError && reject.error.message) ||
    (suspend.error instanceof ApiClientError && suspend.error.message) ||
    null;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium text-stone-900">{therapist.fullName}</h2>
          <p className="text-sm text-stone-500">
            {therapist.user.phone} {therapist.user.email && `· ${therapist.user.email}`}
          </p>
          <p className="mt-1 text-sm text-stone-500">{formatKES(therapist.feeKES)} / session</p>
        </div>
        <StatusBadge status={therapist.status} />
      </div>

      {therapist.bio && <p className="mt-3 text-sm text-stone-600">{therapist.bio}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {therapist.specialties.map((s) => (
          <span key={s} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
            {s}
          </span>
        ))}
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Credentials</p>
        {therapist.credentials.length === 0 ? (
          <p className="mt-1 text-sm text-stone-400">None submitted yet.</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {therapist.credentials.map((c) => (
              <li key={c.id} className="text-sm text-stone-600">
                <a href={c.documentUrl} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
                  {c.type}
                </a>{" "}
                — added {formatDateTime(c.createdAt)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {actionError && (
        <Alert variant="error" className="mt-3">
          {actionError}
        </Alert>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {therapist.status === "PENDING_VERIFICATION" && (
          <>
            <Button size="sm" isLoading={verify.isPending} onClick={() => verify.mutate(therapist.userId)}>
              Verify
            </Button>
            <Button size="sm" variant="danger" onClick={() => setModal("reject")}>
              Reject
            </Button>
          </>
        )}
        {(therapist.status === "ACTIVE" || therapist.status === "VERIFIED") && (
          <Button size="sm" variant="danger" onClick={() => setModal("suspend")}>
            Suspend
          </Button>
        )}
      </div>

      <ReasonModal
        open={modal === "reject"}
        title="Reject this application"
        onClose={() => setModal(null)}
        isLoading={reject.isPending}
        error={reject.error instanceof ApiClientError ? reject.error.message : null}
        onConfirm={(reason) => reject.mutate({ id: therapist.userId, reason }, { onSuccess: () => setModal(null) })}
      />
      <ReasonModal
        open={modal === "suspend"}
        title="Suspend this therapist"
        onClose={() => setModal(null)}
        isLoading={suspend.isPending}
        error={suspend.error instanceof ApiClientError ? suspend.error.message : null}
        onConfirm={(reason) => suspend.mutate({ id: therapist.userId, reason }, { onSuccess: () => setModal(null) })}
      />
    </Card>
  );
}

export function AdminTherapistsPage() {
  const [status, setStatus] = useState<TherapistStatus | "">("PENDING_VERIFICATION");
  const { data, isLoading, isError } = useAdminTherapists(status || undefined);

  return (
    <div>
      <PageHeader title="Therapist review" description="Verify credentials before a therapist appears in the public directory." />

      <div className="mb-6 max-w-xs">
        <SelectField id="statusFilter" label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as TherapistStatus)}>
          <option value="">All</option>
          {THERAPIST_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_FILTER_LABELS[s]}
            </option>
          ))}
        </SelectField>
      </div>

      {isLoading && <PageSpinner label="Loading therapists..." />}
      {isError && <Alert variant="error">Couldn&apos;t load therapists right now.</Alert>}

      {data && data.therapists.length === 0 && <EmptyState title="Nothing here" description="No therapists match this filter." />}

      {data && data.therapists.length > 0 && (
        <div className="space-y-4">
          {data.therapists.map((t) => (
            <TherapistRow key={t.userId} therapist={t} />
          ))}
        </div>
      )}
    </div>
  );
}
