import { useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useUnreadMessageCount } from "../features/messages/hooks";
import clsx from "clsx";
import { Button } from "./Button";
import { LinkButton } from "./LinkButton";

interface NavLink {
  to: string;
  label: string;
  showsUnreadMessages?: boolean;
}

const ROLE_NAV_LINKS: Record<string, NavLink[]> = {
  CLIENT: [
    { to: "/therapists", label: "Find a therapist" },
    { to: "/bookings", label: "My bookings" },
    { to: "/messages", label: "Messages", showsUnreadMessages: true },
    { to: "/toolkit", label: "Toolkit" },
    { to: "/complaints", label: "Complaints" },
  ],
  THERAPIST: [
    { to: "/therapist/profile", label: "My profile" },
    { to: "/therapist/availability", label: "Availability" },
    { to: "/bookings", label: "My bookings" },
    { to: "/messages", label: "Messages", showsUnreadMessages: true },
    { to: "/complaints", label: "Complaints" },
  ],
  ADMIN: [
    { to: "/admin/therapists", label: "Therapist review" },
    { to: "/admin/complaints", label: "Complaints" },
    { to: "/admin/fee-assistance", label: "Reduced fees" },
  ],
};

/** Shown to signed-out visitors; the hash links land on landing-page sections. */
const PUBLIC_NAV_LINKS: NavLink[] = [
  { to: "/therapists", label: "Find a therapist" },
  { to: "/#how-it-works", label: "How it works" },
  { to: "/#faq", label: "FAQ" },
];

function NavBar() {
  const { user, status, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const links = user ? (ROLE_NAV_LINKS[user.role] ?? []) : PUBLIC_NAV_LINKS;
  const { data: unread } = useUnreadMessageCount(links.some((link) => link.showsUnreadMessages));
  const unreadCount = unread?.count ?? 0;

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to={user ? "/dashboard" : "/"} className="text-lg font-semibold text-brand-800">
          Mind Hub
        </Link>

        <nav aria-label="Primary" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={clsx(
                "inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-brand-700",
                !user && "hidden md:inline-flex",
              )}
            >
              {link.label}
              {link.showsUnreadMessages && unreadCount > 0 && (
                <span className="rounded-full bg-brand-700 px-1.5 py-0.5 text-xs leading-none font-semibold text-white">
                  {unreadCount}
                  <span className="sr-only"> unread</span>
                </span>
              )}
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

function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <p className="text-lg font-semibold text-brand-800">Mind Hub</p>
            <p className="mt-2 max-w-xs text-sm text-stone-500">
              Online counselling with licensed, verified therapists, wherever you are in Kenya.
            </p>
          </div>
          <nav aria-labelledby="footer-support-heading">
            <h2 id="footer-support-heading" className="text-sm font-semibold text-stone-900">
              Get support
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {PUBLIC_NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-stone-600 hover:text-brand-700">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/#gifts" className="text-stone-600 hover:text-brand-700">
                  Gift sessions
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-labelledby="footer-therapists-heading">
            <h2 id="footer-therapists-heading" className="text-sm font-semibold text-stone-900">
              For therapists
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/register?role=therapist" className="text-stone-600 hover:text-brand-700">
                  Apply to join
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-stone-600 hover:text-brand-700">
                  Therapist log in
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <p className="mt-8 rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-600">
          <span className="font-medium text-stone-900">In crisis?</span> Mind Hub isn&apos;t an emergency service. If you
          or someone else may be in danger, call <span className="font-semibold text-stone-900">999</span> or{" "}
          <span className="font-semibold text-stone-900">112</span>, or go to your nearest hospital emergency department.
        </p>
        <p className="mt-6 text-xs text-stone-500">&copy; {new Date().getFullYear()} Mind Hub</p>
      </div>
    </footer>
  );
}

/** BrowserRouter leaves scroll position alone on navigation, so following a link from
 * the bottom of the (long) landing page would open the next page scrolled to its end.
 * Hash links (/#faq) scroll to their section instead. Search-param changes, like the
 * directory filter, deliberately keep the current position. */
function ScrollOnNavigate() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <ScrollOnNavigate />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <NavBar />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
