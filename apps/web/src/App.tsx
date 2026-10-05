import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./features/auth/AuthContext";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { RequireRole } from "./features/auth/RequireRole";
import { RegisterPage } from "./features/auth/RegisterPage";
import { VerifyOtpPage } from "./features/auth/VerifyOtpPage";
import { LoginPage } from "./features/auth/LoginPage";
import { LandingPage } from "./features/landing/LandingPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { TherapistDirectoryPage } from "./features/therapists/TherapistDirectoryPage";
import { TherapistProfilePage } from "./features/therapists/TherapistProfilePage";
import { TherapistProfileEditPage } from "./features/therapists/TherapistProfileEditPage";
import { AvailabilityPage } from "./features/therapists/AvailabilityPage";
import { IntakePage } from "./features/intake/IntakePage";
import { MatchesPage } from "./features/matching/MatchesPage";
import { SwitchTherapistPage } from "./features/matching/SwitchTherapistPage";
import { BookingsListPage } from "./features/bookings/BookingsListPage";
import { BookingDetailPage } from "./features/bookings/BookingDetailPage";
import { ComplaintsPage } from "./features/complaints/ComplaintsPage";
import { MessagesPage } from "./features/messages/MessagesPage";
import { ToolkitLayout } from "./features/toolkit/ToolkitLayout";
import { JournalPage } from "./features/toolkit/JournalPage";
import { GoalsPage } from "./features/toolkit/GoalsPage";
import { WorksheetsPage } from "./features/toolkit/WorksheetsPage";
import { WorksheetPage } from "./features/toolkit/WorksheetPage";
import { ClientSharedPage } from "./features/toolkit/ClientSharedPage";
import { ReducedFeesPage } from "./features/feeAssistance/ReducedFeesPage";
import { AdminFeeAssistancePage } from "./features/feeAssistance/AdminFeeAssistancePage";
import { GiftsPage } from "./features/gifts/GiftsPage";
import { AdminTherapistsPage } from "./features/admin/AdminTherapistsPage";
import { AdminComplaintsPage } from "./features/admin/AdminComplaintsPage";
import { NotFoundPage } from "./features/misc/NotFoundPage";
import { AppShell } from "./components/AppShell";
import { PageContainer } from "./components/PageContainer";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppShell>
            <Routes>
              {/* The landing page lays out its own full-width sections; every other
                  page shares the standard centred container. */}
              <Route path="/" element={<LandingPage />} />

              <Route element={<PageContainer />}>
                {/* Public */}
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-otp" element={<VerifyOtpPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/therapists" element={<TherapistDirectoryPage />} />
                <Route path="/therapists/:id" element={<TherapistProfilePage />} />

                {/* Any authenticated role */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />

                {/* Client */}
                <Route
                  path="/intake"
                  element={
                    <ProtectedRoute>
                      <RequireRole roles={["CLIENT"]}>
                        <IntakePage />
                      </RequireRole>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/intake/:id/matches"
                  element={
                    <ProtectedRoute>
                      <RequireRole roles={["CLIENT"]}>
                        <MatchesPage />
                      </RequireRole>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/switch-therapist/:therapistId"
                  element={
                    <ProtectedRoute>
                      <RequireRole roles={["CLIENT"]}>
                        <SwitchTherapistPage />
                      </RequireRole>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/toolkit"
                  element={
                    <ProtectedRoute>
                      <RequireRole roles={["CLIENT"]}>
                        <ToolkitLayout />
                      </RequireRole>
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="journal" replace />} />
                  <Route path="journal" element={<JournalPage />} />
                  <Route path="goals" element={<GoalsPage />} />
                  <Route path="worksheets" element={<WorksheetsPage />} />
                  <Route path="worksheets/:responseId" element={<WorksheetPage />} />
                </Route>

                <Route
                  path="/reduced-fees"
                  element={
                    <ProtectedRoute>
                      <RequireRole roles={["CLIENT"]}>
                        <ReducedFeesPage />
                      </RequireRole>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/gifts"
                  element={
                    <ProtectedRoute>
                      <RequireRole roles={["CLIENT"]}>
                        <GiftsPage />
                      </RequireRole>
                    </ProtectedRoute>
                  }
                />

                {/* Client + Therapist */}
                <Route
                  path="/bookings"
                  element={
                    <ProtectedRoute>
                      <RequireRole roles={["CLIENT", "THERAPIST"]}>
                        <BookingsListPage />
                      </RequireRole>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/bookings/:id"
                  element={
                    <ProtectedRoute>
                      <RequireRole roles={["CLIENT", "THERAPIST"]}>
                        <BookingDetailPage />
                      </RequireRole>
                    </ProtectedRoute>
                  }
                />
                {["/messages", "/messages/:counterpartId"].map((path) => (
                  <Route
                    key={path}
                    path={path}
                    element={
                      <ProtectedRoute>
                        <RequireRole roles={["CLIENT", "THERAPIST"]}>
                          <MessagesPage />
                        </RequireRole>
                      </ProtectedRoute>
                    }
                  />
                ))}
                <Route
                  path="/complaints"
                  element={
                    <ProtectedRoute>
                      <RequireRole roles={["CLIENT", "THERAPIST"]}>
                        <ComplaintsPage />
                      </RequireRole>
                    </ProtectedRoute>
                  }
                />

                {/* Therapist */}
                <Route
                  path="/therapist/profile"
                  element={
                    <ProtectedRoute>
                      <RequireRole roles={["THERAPIST"]}>
                        <TherapistProfileEditPage />
                      </RequireRole>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/therapist/availability"
                  element={
                    <ProtectedRoute>
                      <RequireRole roles={["THERAPIST"]}>
                        <AvailabilityPage />
                      </RequireRole>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/clients/:clientId"
                  element={
                    <ProtectedRoute>
                      <RequireRole roles={["THERAPIST"]}>
                        <ClientSharedPage />
                      </RequireRole>
                    </ProtectedRoute>
                  }
                />

                {/* Admin */}
                <Route
                  path="/admin/therapists"
                  element={
                    <ProtectedRoute>
                      <RequireRole roles={["ADMIN"]}>
                        <AdminTherapistsPage />
                      </RequireRole>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/complaints"
                  element={
                    <ProtectedRoute>
                      <RequireRole roles={["ADMIN"]}>
                        <AdminComplaintsPage />
                      </RequireRole>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/fee-assistance"
                  element={
                    <ProtectedRoute>
                      <RequireRole roles={["ADMIN"]}>
                        <AdminFeeAssistancePage />
                      </RequireRole>
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </AppShell>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
