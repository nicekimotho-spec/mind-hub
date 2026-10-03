import { useState, type FormEvent } from "react";
import { createSlotRequestSchema } from "@mind-hub/shared";
import { useCreateSlot, useMySlots } from "./hooks";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { Badge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { PageSpinner } from "../../components/Spinner";
import { TextField } from "../../components/fields";
import { ApiClientError } from "../../api/client";
import { formatTimeRange } from "../../lib/format";

export function AvailabilityPage() {
  const { data, isLoading } = useMySlots();
  const createSlot = useCreateSlot();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = createSlotRequestSchema.safeParse({ startTime, endTime });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the times you entered");
      return;
    }

    try {
      await createSlot.mutateAsync(parsed.data);
      setStartTime("");
      setEndTime("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't create that slot.");
    }
  }

  const now = Date.now();
  const upcoming = data?.slots.filter((s) => new Date(s.endTime).getTime() > now) ?? [];
  const past = data?.slots.filter((s) => new Date(s.endTime).getTime() <= now) ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Availability" description="Add times you're free to see clients. Clients can only book slots you've published here." />

      <Card>
        <h2 className="font-medium text-stone-900">Add a slot</h2>
        <form onSubmit={handleSubmit} noValidate className="mt-3 flex flex-wrap items-end gap-3">
          <TextField
            id="startTime"
            label="Starts"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <TextField id="endTime" label="Ends" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          <Button type="submit" isLoading={createSlot.isPending}>
            Add slot
          </Button>
        </form>
        {error && (
          <Alert variant="error" className="mt-3">
            {error}
          </Alert>
        )}
      </Card>

      {isLoading && <PageSpinner label="Loading your schedule..." />}

      {data && upcoming.length === 0 && <EmptyState className="mt-6" title="No upcoming slots" description="Add one above to start getting booked." />}

      {upcoming.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-stone-700">Upcoming</h2>
          <ul className="space-y-2">
            {upcoming.map((slot) => (
              <li key={slot.id} className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm">
                <span className="text-stone-700">{formatTimeRange(slot.startTime, slot.endTime)}</span>
                <Badge tone={slot.isBooked ? "positive" : "neutral"}>{slot.isBooked ? "Booked" : "Open"}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {past.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-stone-700">Past</h2>
          <ul className="space-y-2 opacity-60">
            {past.map((slot) => (
              <li key={slot.id} className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm">
                <span className="text-stone-700">{formatTimeRange(slot.startTime, slot.endTime)}</span>
                <Badge tone={slot.isBooked ? "positive" : "neutral"}>{slot.isBooked ? "Booked" : "Open"}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
