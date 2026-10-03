import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CONCERN_TAGS, COMMUNICATION_METHODS, INTAKE_DAYS, INTAKE_TIMES_OF_DAY, intakeRequestSchema } from "@mind-hub/shared";
import { useCreateIntake } from "./hooks";
import { SafetyBlockedNotice } from "./SafetyBlockedNotice";
import { zodErrorsToFieldMap } from "../../lib/zodErrors";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { TextareaField, SelectField, CheckboxGroupField, YesNoField } from "../../components/fields";
import { ApiClientError } from "../../api/client";

const DAY_LABELS: Record<string, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday",
};

const TIME_LABELS: Record<string, string> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
};

export function IntakePage() {
  const navigate = useNavigate();
  const createIntake = useCreateIntake();

  const [presentingConcern, setPresentingConcern] = useState("");
  const [concernTags, setConcernTags] = useState<string[]>([]);
  const [preferredApproach, setPreferredApproach] = useState("");
  const [preferredCommunicationMethod, setPreferredCommunicationMethod] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [timesOfDay, setTimesOfDay] = useState<string[]>([]);
  const [safetyAnswers, setSafetyAnswers] = useState({
    hasThoughtsOfSelfHarm: false,
    hasPlanOrIntent: false,
    hasAccessToMeans: false,
    isInImmediateDanger: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = intakeRequestSchema.safeParse({
      presentingConcern,
      concernTags,
      preferredApproach: preferredApproach || undefined,
      preferredCommunicationMethod: preferredCommunicationMethod || undefined,
      availability: { days, timesOfDay },
      safetyAnswers,
    });
    if (!parsed.success) {
      setFieldErrors(zodErrorsToFieldMap(parsed.error));
      return;
    }

    try {
      const res = await createIntake.mutateAsync(parsed.data);
      if (res.intake.blockedBooking) {
        setBlocked(true);
        return;
      }
      navigate(`/intake/${res.intake.id}/matches`);
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (blocked) {
    return (
      <div className="mx-auto max-w-xl">
        <SafetyBlockedNotice />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Tell us a bit about what's going on"
        description="This helps us match you with a therapist who's a good fit. Nothing here is shared publicly."
      />

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <Card className="space-y-4">
          <h2 className="font-medium text-stone-900">What&apos;s bringing you here</h2>

          <CheckboxGroupField
            legend="What would you like support with? (select all that apply)"
            name="concernTags"
            options={CONCERN_TAGS}
            value={concernTags}
            onChange={setConcernTags}
            error={fieldErrors["concernTags"]}
            columns={2}
          />

          <TextareaField
            id="presentingConcern"
            label="In your own words, what's going on?"
            required
            value={presentingConcern}
            onChange={(e) => setPresentingConcern(e.target.value)}
            error={fieldErrors["presentingConcern"]}
          />

          <TextareaField
            id="preferredApproach"
            label="Any preferences for therapy approach? (optional)"
            rows={2}
            value={preferredApproach}
            onChange={(e) => setPreferredApproach(e.target.value)}
            error={fieldErrors["preferredApproach"]}
          />
        </Card>

        <Card className="space-y-4">
          <h2 className="font-medium text-stone-900">When and how you&apos;d like to meet</h2>

          <CheckboxGroupField
            legend="Which days generally work for you?"
            name="days"
            options={INTAKE_DAYS}
            labels={DAY_LABELS}
            value={days}
            onChange={setDays}
            error={fieldErrors["availability.days"]}
            columns={2}
          />

          <CheckboxGroupField
            legend="Which times of day?"
            name="timesOfDay"
            options={INTAKE_TIMES_OF_DAY}
            labels={TIME_LABELS}
            value={timesOfDay}
            onChange={setTimesOfDay}
            error={fieldErrors["availability.timesOfDay"]}
          />

          <SelectField
            id="preferredCommunicationMethod"
            label="Preferred way to meet (optional)"
            value={preferredCommunicationMethod}
            onChange={(e) => setPreferredCommunicationMethod(e.target.value)}
          >
            <option value="">No preference</option>
            {COMMUNICATION_METHODS.map((method) => (
              <option key={method} value={method}>
                {method === "VIDEO" ? "Video call" : "Audio call"}
              </option>
            ))}
          </SelectField>
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="font-medium text-stone-900">A brief safety check</h2>
            <p className="mt-1 text-sm text-stone-500">
              We ask everyone these questions so we can connect you with the right kind of support. Please answer honestly —
              there&apos;s no wrong answer.
            </p>
          </div>

          <YesNoField
            legend="Have you had thoughts of harming yourself recently?"
            name="hasThoughtsOfSelfHarm"
            value={safetyAnswers.hasThoughtsOfSelfHarm}
            onChange={(v) => setSafetyAnswers((s) => ({ ...s, hasThoughtsOfSelfHarm: v }))}
          />
          <YesNoField
            legend="Do you have a specific plan or intent to act on those thoughts?"
            name="hasPlanOrIntent"
            value={safetyAnswers.hasPlanOrIntent}
            onChange={(v) => setSafetyAnswers((s) => ({ ...s, hasPlanOrIntent: v }))}
          />
          <YesNoField
            legend="Do you currently have access to means that could be used to act on those thoughts?"
            name="hasAccessToMeans"
            value={safetyAnswers.hasAccessToMeans}
            onChange={(v) => setSafetyAnswers((s) => ({ ...s, hasAccessToMeans: v }))}
          />
          <YesNoField
            legend="Are you in immediate danger right now?"
            name="isInImmediateDanger"
            value={safetyAnswers.isInImmediateDanger}
            onChange={(v) => setSafetyAnswers((s) => ({ ...s, isInImmediateDanger: v }))}
          />
        </Card>

        {formError && <Alert variant="error">{formError}</Alert>}

        <Button type="submit" size="lg" isLoading={createIntake.isPending} className="w-full">
          {createIntake.isPending ? "Submitting..." : "Continue to matching"}
        </Button>
      </form>
    </div>
  );
}
