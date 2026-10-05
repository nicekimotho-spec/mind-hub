import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { SWITCH_REASONS, type SwitchReason } from "@mind-hub/shared";
import { useSwitchTherapist } from "./hooks";
import { useCareTeam } from "../careTeam/hooks";
import { useMyBookings } from "../bookings/hooks";
import { TherapistCard } from "../therapists/TherapistCard";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { EmptyState } from "../../components/EmptyState";
import { PageSpinner } from "../../components/Spinner";
import { RadioGroupField, TextareaField } from "../../components/fields";
import { ApiClientError } from "../../api/client";

const REASON_LABELS: Record<SwitchReason, string> = {
  NOT_A_GOOD_FIT: "It just didn't feel like the right fit",
  APPROACH: "I'd like a different approach or style",
  AVAILABILITY: "Their times don't work for me",
  COST: "Their fee is more than I can manage",
  LANGUAGE: "I'd prefer a different language",
  OTHER: "Something else",
  PREFER_NOT_TO_SAY: "I'd rather not say",
};

const UPCOMING_STATUSES = new Set(["PENDING_PAYMENT", "CONFIRMED"]);

export function SwitchTherapistPage() {
  const { therapistId } = useParams<{ therapistId: string }>();
  const { data: careTeam, isLoading } = useCareTeam();
  const { data: bookings } = useMyBookings();
  const switchTherapist = useSwitchTherapist();
  const [reason, setReason] = useState<SwitchReason | "">("");
  const [comment, setComment] = useState("");
  const [reasonError, setReasonError] = useState<string | undefined>();

  if (isLoading) return <PageSpinner label="Loading..." />;

  const current = careTeam?.members.find((m) => m.id === therapistId);
  if (!therapistId || !current) {
    return <Alert variant="error">We couldn&apos;t find that therapist in your care team.</Alert>;
  }

  const fromTherapistId = current.id;
  const upcomingWithCurrent = (bookings?.bookings ?? []).filter(
    (b) => b.therapistId === therapistId && UPCOMING_STATUSES.has(b.status),
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reason) {
      setReasonError("Choose an option, or “I'd rather not say”");
      return;
    }
    setReasonError(undefined);
    switchTherapist.mutate({ fromTherapistId, reason, comment: comment.trim() || undefined });
  }

  const error = switchTherapist.error;
  const needsIntake = error instanceof ApiClientError && error.code === "INTAKE_REQUIRED";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Switch therapist"
        description={`It's completely okay to look for someone else. Finding the right fit matters, and ${current.fullName} won't be told why.`}
      />

      {!switchTherapist.data && (
        <Card>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <RadioGroupField
              legend="What's prompting the change?"
              hint="This only helps us suggest better matches and improve the service."
              name="reason"
              options={SWITCH_REASONS}
              labels={REASON_LABELS}
              value={reason}
              onChange={setReason}
              error={reasonError}
            />
            <TextareaField
              id="comment"
              label="Anything else we should know? (optional)"
              rows={3}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            {error && (
              <Alert variant={needsIntake ? "info" : "error"}>
                {error instanceof ApiClientError ? error.message : "Couldn't find new matches right now."}
                {needsIntake && (
                  <>
                    {" "}
                    <Link to="/intake" className="font-medium underline">
                      Answer the questions
                    </Link>
                  </>
                )}
              </Alert>
            )}
            <Button type="submit" isLoading={switchTherapist.isPending}>
              Show me other therapists
            </Button>
          </form>
        </Card>
      )}

      {switchTherapist.data && (
        <div className="space-y-6">
          {upcomingWithCurrent.length > 0 && (
            <Alert variant="info">
              You still have {upcomingWithCurrent.length} upcoming {upcomingWithCurrent.length === 1 ? "session" : "sessions"} with{" "}
              {current.fullName}. Nothing has been cancelled. You can keep{" "}
              {upcomingWithCurrent.length === 1 ? "it" : "them"}, or cancel from{" "}
              <Link to="/bookings" className="font-medium underline">
                My bookings
              </Link>
              .
            </Alert>
          )}

          {switchTherapist.data.therapists.length === 0 ? (
            <EmptyState
              title="No other matches right now"
              description="We don't have another available therapist who fits your answers yet. You can browse everyone in the directory."
              action={
                <Link to="/therapists" className="text-sm font-medium text-brand-700 hover:underline">
                  Browse all therapists
                </Link>
              }
            />
          ) : (
            <>
              <h2 className="text-lg font-medium text-stone-900">Therapists who could be a good fit</h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {switchTherapist.data.therapists.map((therapist) => (
                  <li key={therapist.userId}>
                    <TherapistCard therapist={therapist} linkLabel="View profile & book" />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
