import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { LandingPage } from "./LandingPage";

function renderLandingPage() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("LandingPage", () => {
  it("always shows the emergency numbers", () => {
    renderLandingPage();
    expect(screen.getByText(/in crisis, or worried someone may be in danger/i)).toHaveTextContent(/999.*112/);
  });

  it("support-type cards open the directory pre-filtered, and 'not sure' starts matching", () => {
    renderLandingPage();
    expect(screen.getByRole("link", { name: /individual for myself/i })).toHaveAttribute(
      "href",
      "/therapists?specialty=Individual+counselling",
    );
    expect(screen.getByRole("link", { name: /couples & family/i })).toHaveAttribute(
      "href",
      "/therapists?specialty=Couples+and+family+counselling",
    );
    // Signed-out visitors need an account before they can take the intake questionnaire.
    expect(screen.getByRole("link", { name: /not sure yet/i })).toHaveAttribute("href", "/register");
  });

  it("compares against in-person counselling in an accessible table", () => {
    renderLandingPage();
    const table = screen.getByRole("table", { name: /compared with traditional in-person counselling/i });
    const row = within(table).getByRole("row", { name: /face-to-face in the same room/i });
    // Honest about what online can't do: Mind Hub "No", in-person "Yes".
    expect(within(row).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["No", "Yes"]);
  });

  it("lists FAQs as expandable disclosure widgets", () => {
    renderLandingPage();
    const faqSection = screen.getByRole("region", { name: /frequently asked questions/i });
    expect(within(faqSection).getByText(/how much does it cost\?/i).closest("details")).not.toBeNull();
    expect(within(faqSection).getByText(/what if i need help right now\?/i)).toBeInTheDocument();
  });

  it("offers gift sessions, sending visitors to create an account first", () => {
    renderLandingPage();
    expect(screen.getByRole("link", { name: /send a gift/i })).toHaveAttribute("href", "/register");
  });

  it("invites therapists to apply with the therapist role preselected", () => {
    renderLandingPage();
    expect(screen.getByRole("link", { name: /apply to join/i })).toHaveAttribute("href", "/register?role=therapist");
  });
});
