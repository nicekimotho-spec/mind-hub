import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <main>
      <h1>Welcome, {user?.role === "THERAPIST" ? "Therapist" : "Client"}</h1>
      <p>Phone: {user?.phone}</p>
      <p>Phone verified: {user?.phoneVerified ? "Yes" : "No"}</p>
      <button type="button" onClick={handleLogout}>
        Log out
      </button>
    </main>
  );
}
