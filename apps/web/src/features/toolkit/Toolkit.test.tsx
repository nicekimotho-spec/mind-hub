import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { JournalEntryResponse, SharedWithTherapist, WorksheetResponseRecord } from "@mind-hub/shared";
import { server } from "../../test/mswServer";
import { API_BASE_URL, testUser } from "../../test/handlers";
import { renderRoute, signInAs, testTherapistUser } from "../../test/renderWithProviders";
import { JournalPage } from "./JournalPage";
import { WorksheetPage } from "./WorksheetPage";
import { ClientSharedPage } from "./ClientSharedPage";

const therapist = { id: testTherapistUser.id, fullName: "Brian Therapist" };

function careTeam(members = [therapist]) {
  return http.get(`${API_BASE_URL}/care-team`, () => HttpResponse.json({ members }));
}

describe("JournalPage", () => {
  it("saves a private entry by default, then lists it", async () => {
    signInAs();
    const entries: JournalEntryResponse[] = [];
    let posted: unknown;
    server.use(
      careTeam(),
      http.get(`${API_BASE_URL}/journal`, () => HttpResponse.json({ entries })),
      http.post(`${API_BASE_URL}/journal`, async ({ request }) => {
        posted = await request.json();
        const entry = {
          id: crypto.randomUUID(),
          title: null,
          body: "Slept badly",
          mood: 2,
          sharedWithTherapistId: null,
          createdAt: "2026-10-05T07:00:00.000Z",
          updatedAt: "2026-10-05T07:00:00.000Z",
        };
        entries.push(entry);
        return HttpResponse.json({ entry }, { status: 201 });
      }),
    );
    renderRoute(<JournalPage />, { path: "/", route: "/" });
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/what's on your mind/i), "Slept badly");
    await user.selectOptions(screen.getByLabelText(/how are you feeling/i), "2");
    await user.click(screen.getByRole("button", { name: /save entry/i }));

    await waitFor(() => expect(posted).toEqual({ body: "Slept badly", mood: 2, sharedWithTherapistId: null }));
    expect(await screen.findByText("Private")).toBeInTheDocument();
    expect(screen.getByText(/feeling: low/i)).toBeInTheDocument();
  });

  it("offers sharing only with the client's own therapists", async () => {
    signInAs();
    server.use(careTeam(), http.get(`${API_BASE_URL}/journal`, () => HttpResponse.json({ entries: [] })));
    renderRoute(<JournalPage />, { path: "/", route: "/" });

    const share = await screen.findByLabelText(/who can see this/i);
    await waitFor(() => expect(within(share).getAllByRole("option").map((o) => o.textContent)).toEqual(["Only me", "Me and Brian Therapist"]));
  });
});

describe("WorksheetPage", () => {
  const response: WorksheetResponseRecord = {
    id: "66666666-6666-6666-6666-666666666666",
    worksheetSlug: "grounding-5-4-3-2-1",
    assignedById: therapist.id,
    assignedByName: "Brian Therapist",
    assignmentNote: "Try this when work feels like too much.",
    status: "NOT_STARTED",
    answers: {},
    sharedWithTherapistId: therapist.id,
    createdAt: "2026-10-05T07:00:00.000Z",
    updatedAt: "2026-10-05T07:00:00.000Z",
    completedAt: null,
  };

  it("shows the therapist's note, and saves text and scale answers on completion", async () => {
    signInAs();
    let patched: unknown;
    server.use(
      careTeam(),
      http.get(`${API_BASE_URL}/worksheets/responses/:id`, () => HttpResponse.json({ worksheet: response })),
      http.patch(`${API_BASE_URL}/worksheets/responses/:id`, async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json({ worksheet: { ...response, status: "COMPLETED" } });
      }),
    );
    renderRoute(<WorksheetPage />, { path: "/toolkit/worksheets/:responseId", route: `/toolkit/worksheets/${response.id}` });
    const user = userEvent.setup();

    expect(await screen.findByText(/try this when work feels like too much/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/five things you can see/i), "Lamp, window, mug, plant, book");
    await user.click(within(screen.getByRole("group", { name: /how settled do you feel now/i })).getByLabelText("7"));
    await user.click(screen.getByRole("button", { name: /mark as complete/i }));

    await waitFor(() =>
      expect(patched).toEqual({
        answers: { see: "Lamp, window, mug, plant, book", calmAfter: 7 },
        sharedWithTherapistId: therapist.id,
        status: "COMPLETED",
      }),
    );
    expect(await screen.findByText(/marked as complete/i)).toBeInTheDocument();
  });
});

describe("ClientSharedPage", () => {
  const shared: SharedWithTherapist = {
    client: { id: testUser.id, fullName: "Amina Client" },
    journalEntries: [],
    goals: [
      {
        id: crypto.randomUUID(),
        title: "Walk daily",
        description: null,
        status: "ACTIVE",
        progress: 30,
        sharedWithTherapistId: testTherapistUser.id,
        createdAt: "2026-10-05T07:00:00.000Z",
        updatedAt: "2026-10-05T07:00:00.000Z",
      },
    ],
    worksheets: [],
  };

  it("shows shared goals and lets the therapist suggest a worksheet", async () => {
    signInAs(testTherapistUser);
    let assigned: unknown;
    server.use(
      http.get(`${API_BASE_URL}/clients/:clientId/shared`, () => HttpResponse.json({ shared })),
      http.post(`${API_BASE_URL}/worksheets/assignments`, async ({ request }) => {
        assigned = await request.json();
        return HttpResponse.json({ worksheet: {} }, { status: 201 });
      }),
    );
    renderRoute(<ClientSharedPage />, { path: "/clients/:clientId", route: `/clients/${testUser.id}` });
    const user = userEvent.setup();

    expect(await screen.findByText("Walk daily")).toBeInTheDocument();
    expect(screen.getByText(/30% of the way there/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/^worksheet$/i), "sleep-diary");
    await user.click(screen.getByRole("button", { name: /add to their toolkit/i }));

    await waitFor(() => expect(assigned).toEqual({ clientId: testUser.id, worksheetSlug: "sleep-diary" }));
    expect(await screen.findByText(/amina client has been sent a message/i)).toBeInTheDocument();
  });
});
