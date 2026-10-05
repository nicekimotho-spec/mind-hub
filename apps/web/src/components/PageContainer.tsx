import { Outlet } from "react-router-dom";

/** Standard centred page width for every route except the landing page, which lays out
 * its own full-width sections. Used as a pathless layout route in App.tsx. */
export function PageContainer() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Outlet />
    </div>
  );
}
