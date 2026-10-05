import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { BookingDetail, PublicTherapist } from "@mind-hub/shared";
import { server } from "../../test/mswServer";
import { API_BASE_URL, testUser } from "../../test/handlers";
import { renderRoute, signInAs } from "../../test/renderWithProviders";
import { SwitchTherapistPage } from "./SwitchTherapistPage";

const currentId = "33333333-3333-3333-3333-333333333333";

const suggestion: PublicTherapist = {
  userId: "44444444-4444-4444-4444-444444444444",
  fullName: "Grace Newmatch",
  bio: null,
  specialties: ["Stress and anxiety management"],
  languages: ["English"],
  approach: null,
  feeKES: 2000,
  photoUrl: null,
  yearsExperience: 6,
  registrationNumber: null,
  verifiedAt: "2026-09-01T00:00:00.000Z",
  reducedFeeKES: null,
  rating: null,
};

function upcomingBooking(): Partial<BookingDetail> {
  return { id: crypto.randomUUID(), therapistId: currentId, status: "CONFIRMED" };
}

function setup() {
  signInAs(testUser);
  let requestBody: unknown;
  server.use(
    http.get(`${API_BASE_URL}/care-team`, () => HttpResponse.json({ members: [{ id: currentId, fullName: "Brian Therapist" }] })),
    http.get(`${API_BASE_URL}/bookings`, () => HttpResponse.json({ bookings: [upcomingBooking()] })),
    http.post(`${API_BASE_URL}/matching/switch`, async ({ request }) => {
      requestBody = await request.json();
      return HttpResponse.json({ switchId: crypto.randomUUID(), therapists: [suggestion] });
    }),
  );
  renderRoute(<SwitchTherapistPage />, { path: "/switch-therapist/:therapistId", route: `/switch-therapist/${currentId}` });
  return { getRequestBody: () => requestBody };
}

describe("SwitchTherapistPage", () => {
  it("asks for a reason (with an opt-out) before searching", async () => {
    setup();
    await userEvent.setup().click(await screen.findByRole("button", { name: /show me other therapists/i }));
    expect(await screen.findByText(/choose an option, or .i'd rather not say./i)).toBeInTheDocument();
  });

  it("shows new matches, and reminds the client their existing sessions weren't cancelled", async () => {
    const { getRequestBody } = setup();
    const user = userEvent.setup();

    expect(await screen.findByText(/brian therapist won't be told why/i)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/i'd rather not say/i));
    await user.click(screen.getByRole("button", { name: /show me other therapists/i }));

    expect(await screen.findByText("Grace Newmatch")).toBeInTheDocument();
    expect(screen.getByText(/you still have 1 upcoming session with brian therapist/i)).toBeInTheDocument();
    expect(getRequestBody()).toEqual({ fromTherapistId: currentId, reason: "PREFER_NOT_TO_SAY" });
  });

  it("links to the intake when the client hasn't done one", async () => {
    setup();
    server.use(
      http.post(`${API_BASE_URL}/matching/switch`, () =>
        HttpResponse.json({ error: { code: "INTAKE_REQUIRED", message: "Answer a few quick questions first." } }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();

    await user.click(await screen.findByLabelText(/something else/i));
    await user.click(screen.getByRole("button", { name: /show me other therapists/i }));

    expect(await screen.findByRole("link", { name: /answer the questions/i })).toHaveAttribute("href", "/intake");
  });
});
