import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { MessageResponse } from "@mind-hub/shared";
import { server } from "../../test/mswServer";
import { API_BASE_URL, testUser } from "../../test/handlers";
import { renderRoute, signInAs, testTherapistUser } from "../../test/renderWithProviders";
import { MessagesPage } from "./MessagesPage";

const therapistId = testTherapistUser.id;

function message(overrides: Partial<MessageResponse>): MessageResponse {
  return {
    id: crypto.randomUUID(),
    senderId: therapistId,
    body: "Hello",
    riskFlagged: false,
    sessionId: null,
    readAt: null,
    createdAt: "2026-10-05T07:00:00.000Z",
    ...overrides,
  };
}

function mockConversation(messages: MessageResponse[], counterpart = { id: therapistId, fullName: "Brian Therapist" }) {
  server.use(
    http.get(`${API_BASE_URL}/messages/threads`, () =>
      HttpResponse.json({
        threads: [{ counterpartId: counterpart.id, counterpartName: counterpart.fullName, lastMessage: null, unreadCount: 2 }],
      }),
    ),
    http.get(`${API_BASE_URL}/messages/threads/:id`, () => HttpResponse.json({ thread: { counterpart, messages } })),
  );
}

describe("MessagesPage", () => {
  it("lists conversations with unread counts", async () => {
    signInAs();
    mockConversation([]);
    renderRoute(<MessagesPage />, { path: "/messages", route: "/messages" });

    const link = await screen.findByRole("link", { name: /brian therapist/i });
    expect(link).toHaveTextContent(/2\s*unread/);
  });

  it("shows the conversation, with the emergency line always visible to clients", async () => {
    signInAs();
    mockConversation([message({ body: "How did the week go?" }), message({ senderId: testUser.id, body: "Better, thanks" })]);
    renderRoute(<MessagesPage />, { path: "/messages/:counterpartId", route: `/messages/${therapistId}` });

    const log = await screen.findByRole("log", { name: /conversation with brian therapist/i });
    expect(within(log).getByText("How did the week go?")).toBeInTheDocument();
    expect(within(log).getByText(/you said:/i)).toBeInTheDocument();
    expect(screen.getByText(/in an emergency, call 999 or 112/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /switch therapist/i })).toHaveAttribute("href", `/switch-therapist/${therapistId}`);
  });

  it("shows emergency numbers after a client sends crisis language", async () => {
    signInAs();
    mockConversation([]);
    server.use(
      http.post(`${API_BASE_URL}/messages/threads/:id`, () =>
        HttpResponse.json({ message: message({ senderId: testUser.id, riskFlagged: true }), showCrisisResources: true }, { status: 201 }),
      ),
    );
    renderRoute(<MessagesPage />, { path: "/messages/:counterpartId", route: `/messages/${therapistId}` });
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/your message/i), "I want to end it all");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/call 999 or 112/i);
    expect(screen.getByLabelText(/your message/i)).toHaveValue("");
  });

  it("highlights flagged client messages for the therapist", async () => {
    signInAs(testTherapistUser);
    mockConversation([message({ senderId: testUser.id, body: "I keep hurting myself", riskFlagged: true })], {
      id: testUser.id,
      fullName: "Amina Client",
    });
    renderRoute(<MessagesPage />, { path: "/messages/:counterpartId", route: `/messages/${testUser.id}` });

    expect(await screen.findByText(/this message contains crisis language/i)).toBeInTheDocument();
    // Therapists don't get a "switch therapist" link.
    expect(screen.queryByRole("link", { name: /switch therapist/i })).not.toBeInTheDocument();
  });

  it("doesn't send an empty message", async () => {
    signInAs();
    mockConversation([]);
    let posted = false;
    server.use(
      http.post(`${API_BASE_URL}/messages/threads/:id`, () => {
        posted = true;
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    renderRoute(<MessagesPage />, { path: "/messages/:counterpartId", route: `/messages/${therapistId}` });

    await userEvent.setup().click(await screen.findByRole("button", { name: /send/i }));

    expect(await screen.findByText(/write a message first/i)).toBeInTheDocument();
    expect(posted).toBe(false);
  });
});

describe("MessagesPage while a send is in flight", () => {
  it("keeps a new draft typed before the previous message finished sending", async () => {
    signInAs();
    mockConversation([]);
    let release: () => void = () => {};
    server.use(
      http.post(`${API_BASE_URL}/messages/threads/:id`, async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json({ message: message({ senderId: testUser.id }), showCrisisResources: false }, { status: 201 });
      }),
    );
    renderRoute(<MessagesPage />, { path: "/messages/:counterpartId", route: `/messages/${therapistId}` });
    const user = userEvent.setup();
    const box = await screen.findByLabelText(/your message/i);

    await user.type(box, "First message");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await user.clear(box);
    await user.type(box, "Second message");
    release();

    await waitFor(() => expect(screen.getByRole("button", { name: /send/i })).not.toHaveAttribute("aria-busy"));
    expect(box).toHaveValue("Second message");
  });
});
