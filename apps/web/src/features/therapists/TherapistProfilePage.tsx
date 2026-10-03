import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTherapist, useTherapistSlots } from "./hooks";
import { useCreateBooking } from "../bookings/hooks";
import { useAuth } from "../auth/AuthContext";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { LinkButton } from "../../components/LinkButton";
import { Alert } from "../../components/Alert";
import { EmptyState } from "../../components/EmptyState";
import { PageSpinner } from "../../components/Spinner";
import { ApiClientError } from "../../api/client";
import { formatKES, formatTimeRange } from "../../lib/format";

export function TherapistProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: therapistData, isLoading: loadingTherapist } = useTherapist(id);
  const { data: slotsData, isLoading: loadingSlots } = useTherapistSlots(id);
  const createBooking = useCreateBooking();
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);

  if (loadingTherapist) {
    return <PageSpinner label="Loading therapist profile..." />;
  }

  if (!therapistData) {
    return <Alert variant="error">This therapist could not be found.</Alert>;
  }

  const therapist = therapistData.therapist;

  async function handleBook(slotId: string) {
    setBookingError(null);
    setBookingSlotId(slotId);
    try {
      const res = await createBooking.mutateAsync(slotId);
      navigate(`/bookings/${res.booking.id}`);
    } catch (err) {
      setBookingError(err instanceof ApiClientError ? err.message : "Couldn't book that slot. Please try again.");
    } finally {
      setBookingSlotId(null);
    }
  }

  return (
    <div>
      <PageHeader title={therapist.fullName} description={`${formatKES(therapist.feeKES)} per session`} />

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Card>
            {therapist.bio && <p className="text-sm text-stone-600">{therapist.bio}</p>}
            {therapist.approach && (
              <p className="mt-3 text-sm text-stone-600">
                <span className="font-medium text-stone-900">Approach: </span>
                {therapist.approach}
              </p>
            )}
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Specialties</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {therapist.specialties.map((s) => (
                  <span key={s} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Languages</p>
              <p className="mt-1 text-sm text-stone-600">{therapist.languages.join(", ")}</p>
            </div>
          </Card>
        </div>

        <div>
          <Card>
            <h2 className="font-medium text-stone-900">Available times</h2>

            {bookingError && (
              <Alert variant="error" className="mt-3">
                {bookingError}
              </Alert>
            )}

            {loadingSlots && <PageSpinner label="Loading availability..." />}

            {slotsData && slotsData.slots.length === 0 && (
              <p className="mt-3 text-sm text-stone-500">No open slots right now — check back soon.</p>
            )}

            {slotsData && slotsData.slots.length > 0 && (
              <ul className="mt-3 space-y-2">
                {slotsData.slots.map((slot) => (
                  <li key={slot.id} className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 px-3 py-2">
                    <span className="text-sm text-stone-700">{formatTimeRange(slot.startTime, slot.endTime)}</span>
                    {user?.role === "CLIENT" ? (
                      <Button size="sm" isLoading={bookingSlotId === slot.id} onClick={() => handleBook(slot.id)}>
                        Book
                      </Button>
                    ) : (
                      <LinkButton size="sm" variant="secondary" to={`/login?next=/therapists/${id}`}>
                        Log in to book
                      </LinkButton>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {!user && (
            <EmptyState
              className="mt-4"
              title="New here?"
              description="Create a client account to book a session."
              action={<LinkButton to="/register">Create an account</LinkButton>}
            />
          )}
        </div>
      </div>
    </div>
  );
}
