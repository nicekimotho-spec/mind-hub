import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { FEE_ASSISTANCE_APPROVAL_MONTHS, INCOME_BANDS, applyForFeeAssistanceRequestSchema, type IncomeBand } from "@mind-hub/shared";
import { useApplyForFeeAssistance, useMyFeeAssistance } from "./hooks";
import { INCOME_BAND_LABELS } from "./incomeBands";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { PageSpinner } from "../../components/Spinner";
import { RadioGroupField, TextField, TextareaField } from "../../components/fields";
import { zodErrorsToFieldMap } from "../../lib/zodErrors";
import { ApiClientError } from "../../api/client";

const dateFormatter = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "long", year: "numeric" });

function ApplicationForm() {
  const apply = useApplyForFeeAssistance();
  const [incomeBand, setIncomeBand] = useState<IncomeBand | "">("");
  const [householdSize, setHouseholdSize] = useState("");
  const [reason, setReason] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    const parsed = applyForFeeAssistanceRequestSchema.safeParse({
      incomeBand: incomeBand || undefined,
      householdSize: householdSize ? Number(householdSize) : undefined,
      reason,
    });
    if (!parsed.success) {
      const errors = zodErrorsToFieldMap(parsed.error);
      if (!incomeBand) errors["incomeBand"] = "Choose the option closest to your situation";
      setFieldErrors(errors);
      return;
    }
    try {
      await apply.mutateAsync(parsed.data);
    } catch {
      // Surfaced below via apply.isError.
    }
  }

  return (
    <Card>
      <h2 className="font-medium text-stone-900">Apply for reduced fees</h2>
      <p className="mt-1 text-sm text-stone-500">
        Only the Mind Hub team reviewing applications sees your answers. Therapists never do.
      </p>
      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-5">
        <RadioGroupField
          legend="Your household's income"
          name="incomeBand"
          options={INCOME_BANDS}
          labels={INCOME_BAND_LABELS}
          value={incomeBand}
          onChange={setIncomeBand}
          error={fieldErrors["incomeBand"]}
        />
        <div className="sm:max-w-xs">
          <TextField
            id="householdSize"
            label="People in your household (optional)"
            type="number"
            min={1}
            max={30}
            value={householdSize}
            onChange={(e) => setHouseholdSize(e.target.value)}
            error={fieldErrors["householdSize"]}
          />
        </div>
        <TextareaField
          id="reason"
          label="Tell us a little about your situation"
          hint="A sentence or two is enough."
          rows={4}
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={fieldErrors["reason"]}
        />
        {apply.isError && (
          <Alert variant="error">{apply.error instanceof ApiClientError ? apply.error.message : "Couldn't send your application."}</Alert>
        )}
        <Button type="submit" isLoading={apply.isPending}>
          Send application
        </Button>
      </form>
    </Card>
  );
}

export function ReducedFeesPage() {
  const { data, isLoading } = useMyFeeAssistance();

  if (isLoading || !data) return <PageSpinner label="Loading..." />;

  const { application, isEligible } = data;
  const isPending = application?.status === "PENDING";
  const canApply = !isEligible && !isPending;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Reduced fees"
        description="If cost is standing between you and support, you can apply to pay less. Some therapists offer a reduced fee for people who need it."
      />

      {isEligible && application?.expiresAt && (
        <Alert variant="success">
          You&apos;re approved for reduced fees until {dateFormatter.format(new Date(application.expiresAt))}. When you book with a
          therapist who offers a reduced fee, you&apos;ll be charged it automatically.{" "}
          <Link to="/therapists?reducedFee=true" className="font-medium underline">
            See therapists who offer reduced fees
          </Link>
        </Alert>
      )}

      {isPending && (
        <Alert variant="info">
          We&apos;re reviewing your application, sent on {dateFormatter.format(new Date(application.createdAt))}. We&apos;ll let you know as
          soon as there&apos;s an update.
        </Alert>
      )}

      {application?.status === "DECLINED" && (
        <Alert variant="warning">
          Your last application wasn&apos;t approved.
          {application.reviewNote && ` The team said: “${application.reviewNote}”`} You&apos;re welcome to apply again if your
          situation changes.
        </Alert>
      )}

      {canApply && (
        <>
          <Card>
            <h2 className="font-medium text-stone-900">How it works</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-stone-600">
              <li>Tell us a little about your situation. It takes about two minutes.</li>
              <li>Our team reviews it, usually within a few days.</li>
              <li>
                If approved, you&apos;ll pay the reduced fee with any therapist who offers one, for {FEE_ASSISTANCE_APPROVAL_MONTHS} months.
              </li>
            </ol>
          </Card>
          <ApplicationForm />
        </>
      )}
    </div>
  );
}
