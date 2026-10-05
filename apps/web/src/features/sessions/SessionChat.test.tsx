import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { BookingDetail, MessageResponse } from "@mind-hub/shared";
import { server } from "../../test/mswServer";
import { API_BASE_URL, testUser } from "../../test/handlers";
import { renderRoute, signInAs, testTherapistUser } from "../../test/renderWithProviders";
import { SessionPanel } from "../bookings/SessionPanel";

const sessionId = "88888888-8888-8888-8888-888888888888";

const booking: BookingDetail = {
  id: "99999999-9999-9999-9999-999999999999",
  status: "CONFIRMED",
  createdAt: "2026-10-05T06:00:00.000Z",
  expiresAt: "2026-10-05T06:15:00.000Z",
  slot: { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", startTime: "2026-10-05T07:00:00.000Z", endTime: "2026-10-05T08:00:00.000Z" },
  clientId: testUser.id,
  clientName: "Amina Client",
  therapistId: testTherapistUser.id,
  therapistName: "Brian Therapist",
  feeKES: 2500,
  reducedFee: false,
  paymentStatus: "SUCCEEDED",
  hasConsented: true,
  sessionId,
  sessionStatus: "IN_PROGRESS",
  sessionChannel: "CHAT",
  hasFeedback: false,
};

function chatMessage(overrides: Partial<MessageResponse>): MessageResponse {
  return {
    id: crypto.randomUUID(),
    senderId: testTherapistUser.id,
    body: "Hello",
    riskFlagged: false,
    sessionId,
    readAt: null,
    createdAt: "2026-10-05T07:01:00.000Z",
    ...overrides,
  };
}

describe("live text chat in the session panel", () => {
  it("reopens a running chat session and sends messages", async () => {
    signInAs();
    let sent: unknown;
    server.use(
      http.get(`${API_BASE_URL}/sessions/:id/messages`, () =>
        HttpResponse.json({ messages: [chatMessage({ body: "Hi Amina" })], canSend: true, endsAt: booking.slot.endTime }),
      ),
      http.post(`${API_BASE_URL}/sessions/:id/messages`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ message: chatMessage({ senderId: testUser.id }), showCrisisResources: false }, { status: 201 });
      }),
    );
    renderRoute(<SessionPanel booking={booking} isTherapist={false} />, { path: "/", route: "/" });
    const user = userEvent.setup();

    const log = await screen.findByRole("log", { name: /conversation with brian therapist/i });
    expect(within(log).getByText("Hi Amina")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /join session/i })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/your message/i), "Hi, thanks for making time");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(sent).toEqual({ body: "Hi, thanks for making time" }));
  });

  it("shows an ended chat as read-only", async () => {
    signInAs();
    server.use(
      http.get(`${API_BASE_URL}/sessions/:id/messages`, () =>
        HttpResponse.json({ messages: [chatMessage({})], canSend: false, endsAt: booking.slot.endTime }),
      ),
    );
    renderRoute(<SessionPanel booking={booking} isTherapist={false} />, { path: "/", route: "/" });

    expect(await screen.findByText(/this chat has ended/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/your message/i)).not.toBeInTheDocument();
  });

  it("offers text chat as a way to join", async () => {
    signInAs();
    renderRoute(<SessionPanel booking={{ ...booking, sessionId: null, sessionStatus: null, sessionChannel: null }} isTherapist={false} />, {
      path: "/",
      route: "/",
    });

    const select = await screen.findByLabelText(/join by/i);
    expect(within(select).getByRole("option", { name: /text chat/i })).toBeInTheDocument();
  });
});
