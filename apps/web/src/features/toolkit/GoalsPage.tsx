import { useState, type FormEvent } from "react";
import { createGoalRequestSchema, type GoalResponse } from "@mind-hub/shared";
import { useCreateGoal, useDeleteGoal, useGoals, useUpdateGoal } from "./hooks";
import { ShareSelect } from "./ShareSelect";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { StatusBadge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { PageSpinner } from "../../components/Spinner";
import { SelectField, TextField, TextareaField } from "../../components/fields";
import { zodErrorsToFieldMap } from "../../lib/zodErrors";
import { ApiClientError } from "../../api/client";

const PROGRESS_STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function NewGoalForm() {
  const createGoal = useCreateGoal();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sharedWithTherapistId, setSharedWithTherapistId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    const parsed = createGoalRequestSchema.safeParse({ title, description: description || undefined, sharedWithTherapistId });
    if (!parsed.success) {
      setFieldErrors(zodErrorsToFieldMap(parsed.error));
      return;
    }
    try {
      await createGoal.mutateAsync(parsed.data);
      setTitle("");
      setDescription("");
    } catch {
      // Surfaced below via createGoal.isError.
    }
  }

  return (
    <Card>
      <h2 className="font-medium text-stone-900">Set a goal</h2>
      <p className="mt-1 text-sm text-stone-500">Small and specific works best, like &ldquo;walk for 20 minutes three times a week&rdquo;.</p>
      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        <TextField id="goal-title" label="Goal" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} error={fieldErrors["title"]} />
        <TextareaField
          id="goal-description"
          label="Why it matters, or how you'll know you're there (optional)"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="sm:max-w-xs">
          <ShareSelect id="goal-share" value={sharedWithTherapistId} onChange={setSharedWithTherapistId} />
        </div>
        {createGoal.isError && (
          <Alert variant="error">
            {createGoal.error instanceof ApiClientError ? createGoal.error.message : "Couldn't save your goal."}
          </Alert>
        )}
        <Button type="submit" isLoading={createGoal.isPending}>
          Add goal
        </Button>
      </form>
    </Card>
  );
}

function GoalCard({ goal }: { goal: GoalResponse }) {
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const update = (input: Parameters<typeof updateGoal.mutate>[0]["input"]) => updateGoal.mutate({ id: goal.id, input });

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-medium text-stone-900">{goal.title}</h3>
        <StatusBadge status={goal.status} />
      </div>
      {goal.description && <p className="mt-1 text-sm text-stone-600">{goal.description}</p>}

      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${goal.progress}%` }} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SelectField
          id={`goal-progress-${goal.id}`}
          label="Progress"
          value={String(goal.progress)}
          disabled={goal.status !== "ACTIVE" || updateGoal.isPending}
          onChange={(e) => update({ progress: Number(e.target.value) })}
        >
          {PROGRESS_STEPS.map((step) => (
            <option key={step} value={step}>
              {step}%
            </option>
          ))}
        </SelectField>
        <ShareSelect id={`goal-share-${goal.id}`} value={goal.sharedWithTherapistId} onChange={(value) => update({ sharedWithTherapistId: value })} />
      </div>

      {updateGoal.isError && (
        <Alert variant="error" className="mt-3">
          Couldn&apos;t save that change. Please try again.
        </Alert>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {goal.status === "ACTIVE" && (
          <>
            <Button size="sm" variant="secondary" onClick={() => update({ status: "ACHIEVED" })}>
              Mark achieved
            </Button>
            <Button size="sm" variant="ghost" onClick={() => update({ status: "ARCHIVED" })}>
              Archive
            </Button>
          </>
        )}
        {goal.status !== "ACTIVE" && (
          <Button size="sm" variant="ghost" onClick={() => update({ status: "ACTIVE" })}>
            Make active again
          </Button>
        )}
        <ConfirmDeleteButton itemLabel="goal" isPending={deleteGoal.isPending} onConfirm={() => deleteGoal.mutate(goal.id)} />
      </div>
    </Card>
  );
}

export function GoalsPage() {
  const { data, isLoading } = useGoals();
  const goals = data?.goals ?? [];
  const active = goals.filter((g) => g.status === "ACTIVE");
  const others = goals.filter((g) => g.status !== "ACTIVE");

  return (
    <div className="space-y-6">
      <NewGoalForm />
      {isLoading && <PageSpinner label="Loading your goals..." />}
      {data && goals.length === 0 && <EmptyState title="No goals yet" description="Goals you set here can be a helpful thread to pick up in sessions." />}
      {active.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {active.map((goal) => (
            <li key={goal.id}>
              <GoalCard goal={goal} />
            </li>
          ))}
        </ul>
      )}
      {others.length > 0 && (
        <section aria-labelledby="past-goals-heading">
          <h2 id="past-goals-heading" className="mb-3 text-sm font-medium text-stone-700">
            Achieved and archived
          </h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {others.map((goal) => (
              <li key={goal.id}>
                <GoalCard goal={goal} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
