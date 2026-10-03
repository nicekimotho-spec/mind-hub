import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <p role="status" aria-live="polite">
        Loading...
      </p>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return children;
}
