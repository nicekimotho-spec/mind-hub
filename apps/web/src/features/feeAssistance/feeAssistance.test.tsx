import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { AdminFeeAssistanceApplication, FeeAssistanceApplicationResponse } from "@mind-hub/shared";
import { server } from "../../test/mswServer";
import { API_BASE_URL, testUser } from "../../test/handlers";
import { renderRoute, signInAs } from "../../test/renderWithProviders";
import { ReducedFeesPage } from "./ReducedFeesPage";
import { AdminFeeAssistancePage } from "./AdminFeeAssistancePage";

const pendingApplication: FeeAssistanceApplicationResponse = {
  id: "77777777-7777-7777-7777-777777777777",
  incomeBand: "UNDER_10K",
  householdSize: 3,
  reason: "Between jobs at the moment.",
  status: "PENDING",
  reviewNote: null,
  reviewedAt: null,
  expiresAt: null,
  createdAt: "2026-10-01T07:00:00.000Z",
};

describe("ReducedFeesPage", () => {
  it("sends an application with the chosen income band", async () => {
    signInAs();
    let applied: unknown;
    server.use(
      http.get(`${API_BASE_URL}/fee-assistance/me`, () => HttpResponse.json({ application: null, isEligible: false })),
      http.post(`${API_BASE_URL}/fee-assistance`, async ({ request }) => {
        applied = await request.json();
        return HttpResponse.json({ application: pendingApplication }, { status: 201 });
      }),
    );
    renderRoute(<ReducedFeesPage />, { path: "/", route: "/" });
    const user = userEvent.setup();

    await user.click(await screen.findByLabelText(/no regular income/i));
    await user.type(screen.getByLabelText(/tell us a little about your situation/i), "Recently widowed, caring for two children.");
    await user.click(screen.getByRole("button", { name: /send application/i }));

    await waitFor(() => expect(applied).toEqual({ incomeBand: "NO_INCOME", reason: "Recently widowed, caring for two children." }));
    // Privacy reassurance comes before the form is filled in.
    expect(screen.getByText(/therapists never do/i)).toBeInTheDocument();
  });

  it("asks for an income band before sending", async () => {
    signInAs();
    server.use(http.get(`${API_BASE_URL}/fee-assistance/me`, () => HttpResponse.json({ application: null, isEligible: false })));
    renderRoute(<ReducedFeesPage />, { path: "/", route: "/" });
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/tell us a little about your situation/i), "Struggling with school fees this term.");
    await user.click(screen.getByRole("button", { name: /send application/i }));

    expect(await screen.findByText(/choose the option closest to your situation/i)).toBeInTheDocument();
  });

  it("shows an approval with a link to therapists who offer reduced fees", async () => {
    signInAs();
    server.use(
      http.get(`${API_BASE_URL}/fee-assistance/me`, () =>
        HttpResponse.json({
          application: { ...pendingApplication, status: "APPROVED", expiresAt: "2027-04-05T07:00:00.000Z" },
          isEligible: true,
        }),
      ),
    );
    renderRoute(<ReducedFeesPage />, { path: "/", route: "/" });

    expect(await screen.findByText(/approved for reduced fees until 5 april 2027/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see therapists who offer reduced fees/i })).toHaveAttribute("href", "/therapists?reducedFee=true");
    expect(screen.queryByRole("button", { name: /send application/i })).not.toBeInTheDocument();
  });

  it("shows a pending application instead of the form", async () => {
    signInAs();
    server.use(http.get(`${API_BASE_URL}/fee-assistance/me`, () => HttpResponse.json({ application: pendingApplication, isEligible: false })));
    renderRoute(<ReducedFeesPage />, { path: "/", route: "/" });

    expect(await screen.findByText(/we're reviewing your application/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send application/i })).not.toBeInTheDocument();
  });
});

describe("AdminFeeAssistancePage", () => {
  it("approves an application with a note", async () => {
    signInAs({ ...testUser, role: "ADMIN" });
    const adminView: AdminFeeAssistanceApplication = { ...pendingApplication, clientId: testUser.id, clientName: "Amina Client" };
    let decision: unknown;
    server.use(
      http.get(`${API_BASE_URL}/admin/fee-assistance`, () => HttpResponse.json({ applications: [adminView] })),
      http.post(`${API_BASE_URL}/admin/fee-assistance/:id/decision`, async ({ request }) => {
        decision = await request.json();
        return HttpResponse.json({ application: { ...pendingApplication, status: "APPROVED" } });
      }),
    );
    renderRoute(<AdminFeeAssistancePage />, { path: "/", route: "/" });
    const user = userEvent.setup();

    expect(await screen.findByText("Under KES 10,000 a month")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/note to the client/i), "Welcome aboard");
    await user.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() => expect(decision).toEqual({ decision: "APPROVED", note: "Welcome aboard" }));
  });
});
