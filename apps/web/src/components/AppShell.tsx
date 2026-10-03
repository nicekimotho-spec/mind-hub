import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { Button } from "./Button";
import { LinkButton } from "./LinkButton";

interface NavLink {
  to: string;
  label: string;
}

const ROLE_NAV_LINKS: Record<string, NavLink[]> = {
  CLIENT: [
    { to: "/therapists", label: "Find a therapist" },
    { to: "/bookings", label: "My bookings" },
    { to: "/complaints", label: "Complaints" },
  ],
  THERAPIST: [
    { to: "/therapist/profile", label: "My profile" },
    { to: "/therapist/availability", label: "Availability" },
    { to: "/bookings", label: "My bookings" },
    { to: "/complaints", label: "Complaints" },
  ],
  ADMIN: [
    { to: "/admin/therapists", label: "Therapist review" },
    { to: "/admin/complaints", label: "Complaints" },
  ],
};

function NavBar() {
  const { user, status, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const links = user ? (ROLE_NAV_LINKS[user.role] ?? []) : [];

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to={user ? "/dashboard" : "/"} className="text-lg font-semibold text-brand-800">
          Mind Hub
        </Link>

        <nav aria-label="Primary" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className="text-sm font-medium text-stone-600 hover:text-brand-700">
              {link.label}
            </Link>
          ))}

          {status === "authenticated" && user ? (
            <>
              <Link to="/dashboard" className="text-sm font-medium text-stone-600 hover:text-brand-700">
                Dashboard
              </Link>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-stone-600 hover:text-brand-700">
                Log in
              </Link>
              <LinkButton to="/register" size="sm">
                Get started
              </LinkButton>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <NavBar />
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
