import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useMyBookings } from "./hooks";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { PageSpinner } from "../../components/Spinner";
import { Alert } from "../../components/Alert";
import { LinkButton } from "../../components/LinkButton";
import { formatTimeRange } from "../../lib/format";

export function BookingsListPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useMyBookings();
  const isTherapist = user?.role === "THERAPIST";

  return (
    <div>
      <PageHeader title="My bookings" description={isTherapist ? "Sessions where you're the assigned therapist." : "Your upcoming and past sessions."} />

      {isLoading && <PageSpinner label="Loading bookings..." />}
      {isError && <Alert variant="error">Couldn&apos;t load your bookings right now.</Alert>}

      {data && data.bookings.length === 0 && (
        <EmptyState
          title="No bookings yet"
          description={isTherapist ? "Bookings will show up here once a client books your availability." : "Find a therapist to book your first session."}
          action={!isTherapist ? <LinkButton to="/therapists">Find a therapist</LinkButton> : undefined}
        />
      )}

      {data && data.bookings.length > 0 && (
        <ul className="space-y-3">
          {data.bookings.map((booking) => (
            <li key={booking.id}>
              <Link to={`/bookings/${booking.id}`}>
                <Card className="flex flex-wrap items-center justify-between gap-3 transition-shadow hover:shadow-md">
                  <div>
                    <p className="font-medium text-stone-900">{isTherapist ? booking.clientName : booking.therapistName}</p>
                    <p className="text-sm text-stone-500">{formatTimeRange(booking.slot.startTime, booking.slot.endTime)}</p>
                  </div>
                  <StatusBadge status={booking.status} />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
