import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import { PageHeader } from "../../components/PageHeader";

const TABS = [
  { to: "journal", label: "Journal" },
  { to: "goals", label: "Goals" },
  { to: "worksheets", label: "Worksheets" },
];

export function ToolkitLayout() {
  return (
    <div>
      <PageHeader
        title="Your toolkit"
        description="A private space for reflection between sessions. Only you can see what's here, unless you choose to share an item with your therapist."
      />
      <nav aria-label="Toolkit sections" className="mb-6 flex gap-1 overflow-x-auto border-b border-stone-200">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              clsx(
                "-mb-px border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset",
                isActive ? "border-brand-700 text-brand-800" : "border-transparent text-stone-500 hover:text-stone-800",
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
