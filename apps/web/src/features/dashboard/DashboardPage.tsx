import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useMyBookings } from "../bookings/hooks";
import { useMyTherapistProfile } from "../therapists/hooks";
import { useReportsOverview } from "../admin/hooks";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/Card";
import { LinkButton } from "../../components/LinkButton";
import { StatusBadge } from "../../components/Badge";
import { PageSpinner } from "../../components/Spinner";
import { EmptyState } from "../../components/EmptyState";
import { formatKES, formatTimeRange } from "../../lib/format";
import { NotificationSettingsCard } from "../settings/NotificationSettingsCard";

const UPCOMING_STATUSES = new Set(["PENDING_PAYMENT", "CONFIRMED"]);

function UpcomingBookings({ isTherapist }: { isTherapist: boolean }) {
  const { data, isLoading } = useMyBookings();
  if (isLoading) return <PageSpinner label="Loading bookings..." />;

  const upcoming = (data?.bookings ?? []).filter((b) => UPCOMING_STATUSES.has(b.status)).slice(0, 5);

  if (upcoming.length === 0) {
    return <EmptyState title="No upcoming sessions" description={isTherapist ? "Bookings will appear here once a client books you." : "Book a session to see it here."} />;
  }

  return (
    <ul className="space-y-2">
      {upcoming.map((booking) => (
        <li key={booking.id}>
          <Link to={`/bookings/${booking.id}`}>
            <Card className="flex items-center justify-between gap-3 transition-shadow hover:shadow-md">
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
  );
}

function ClientDashboard() {
  return (
    <div>
      <PageHeader title="Welcome back" description="Here's what's coming up." />
      <div className="mb-6 flex flex-wrap gap-3">
        <LinkButton to="/therapists">Find a therapist</LinkButton>
        <LinkButton to="/intake" variant="secondary">
          Start an intake
        </LinkButton>
        <LinkButton to="/reduced-fees" variant="secondary">
          Reduced fees
        </LinkButton>
        <LinkButton to="/gifts" variant="secondary">
          Gift sessions
        </LinkButton>
        <LinkButton to="/bookings" variant="secondary">
          All bookings
        </LinkButton>
      </div>
      <UpcomingBookings isTherapist={false} />
      <div className="mt-8">
        <NotificationSettingsCard />
      </div>
    </div>
  );
}

function TherapistDashboard() {
  const { data } = useMyTherapistProfile();

  return (
    <div>
      <PageHeader
        title="Welcome back"
        description="Here's what's coming up."
        action={data && <StatusBadge status={data.profile.status} />}
      />
      <div className="mb-6 flex flex-wrap gap-3">
        <LinkButton to="/therapist/availability">Manage availability</LinkButton>
        <LinkButton to="/therapist/profile" variant="secondary">
          Edit profile
        </LinkButton>
        <LinkButton to="/bookings" variant="secondary">
          All bookings
        </LinkButton>
      </div>
      <UpcomingBookings isTherapist={true} />
      <div className="mt-8">
        <NotificationSettingsCard />
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { data, isLoading } = useReportsOverview();

  return (
    <div>
      <PageHeader title="Overview" description="How the platform is doing right now." />
      <div className="mb-6 flex flex-wrap gap-3">
        <LinkButton to="/admin/therapists">Therapist review</LinkButton>
        <LinkButton to="/admin/complaints" variant="secondary">
          Complaints
        </LinkButton>
      </div>

      {isLoading && <PageSpinner label="Loading report..." />}

      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Total bookings</p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">{data.report.totalBookings}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Completion rate</p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">{Math.round(data.report.completionRate * 100)}%</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Cancellation rate</p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">{Math.round(data.report.cancellationRate * 100)}%</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Revenue</p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">{formatKES(data.report.totalRevenueKES)}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Open complaints</p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">{data.report.openComplaints}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Therapist switches</p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">{data.report.therapistSwitches}</p>
          </Card>
          <Link to="/admin/fee-assistance" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <Card className="h-full transition-shadow hover:shadow-md">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Reduced-fee applications to review</p>
              <p className="mt-1 text-2xl font-semibold text-stone-900">{data.report.pendingFeeAssistance}</p>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;
  if (user.role === "THERAPIST") return <TherapistDashboard />;
  if (user.role === "ADMIN") return <AdminDashboard />;
  return <ClientDashboard />;
}
