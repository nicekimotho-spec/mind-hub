import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import type { UserRole } from "@mind-hub/shared";
import { useAuth } from "./AuthContext";
import { PageSpinner } from "../../components/Spinner";

/** Gates a route to specific roles. Assumes it's nested inside <ProtectedRoute> (so
 * "unauthenticated" is already handled) — this only decides whether *this* user's role
 * is allowed here, redirecting to their own dashboard rather than a bare 403 page. */
export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactElement }) {
  const { user, status } = useAuth();

  if (status === "loading") {
    return <PageSpinner />;
  }

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
