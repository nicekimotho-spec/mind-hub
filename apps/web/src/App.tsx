import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import { BookingsListPage } from "./features/bookings/BookingsListPage";
import { BookingDetailPage } from "./features/bookings/BookingDetailPage";
import { ComplaintsPage } from "./features/complaints/ComplaintsPage";
import { AdminTherapistsPage } from "./features/admin/AdminTherapistsPage";
import { AdminComplaintsPage } from "./features/admin/AdminComplaintsPage";
import { NotFoundPage } from "./features/misc/NotFoundPage";
import { AppShell } from "./components/AppShell";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppShell>
            <Routes>
              {/* Public */}
              <Route path="/" element={<LandingPage />} />
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

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
