import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { PublicTherapist } from "@mind-hub/shared";
import { TherapistCard } from "./TherapistCard";

const base: PublicTherapist = {
  userId: "55555555-5555-5555-5555-555555555555",
  fullName: "Wanjiru Mwangi",
  bio: "I help people through change.",
  specialties: ["Grief and life transitions"],
  languages: ["English", "Kiswahili"],
  approach: null,
  feeKES: 2500,
  photoUrl: null,
  yearsExperience: 7,
  registrationNumber: "KCPB/42",
  verifiedAt: "2026-09-01T00:00:00.000Z",
  reducedFeeKES: null,
  rating: { average: 4.6, count: 12 },
};

function renderCard(therapist: PublicTherapist) {
  render(
    <MemoryRouter>
      <TherapistCard therapist={therapist} />
    </MemoryRouter>,
  );
}

describe("TherapistCard", () => {
  it("shows verification, experience and an accessible rating", () => {
    renderCard(base);
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("7 years of experience")).toBeInTheDocument();
    expect(screen.getByText("Rated 4.6 out of 5 from 12 ratings")).toBeInTheDocument();
  });

  it("shows no rating at all until the API supplies one", () => {
    renderCard({ ...base, rating: null });
    expect(screen.queryByText(/rated/i)).not.toBeInTheDocument();
  });

  it("falls back to initials when there's no photo", () => {
    renderCard(base);
    expect(screen.getByText("WM")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});
