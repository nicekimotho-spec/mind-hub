import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/mswServer";
import { API_BASE_URL } from "../../test/handlers";
import { renderRoute, signInAs } from "../../test/renderWithProviders";
import { NotificationSettingsCard } from "./NotificationSettingsCard";

describe("NotificationSettingsCard", () => {
  it("shows the saved preference and saves a change", async () => {
    signInAs();
    let saved: unknown;
    server.use(
      http.get(`${API_BASE_URL}/users/me/preferences`, () => HttpResponse.json({ preferences: { smsNotificationsEnabled: true } })),
      http.patch(`${API_BASE_URL}/users/me/preferences`, async ({ request }) => {
        saved = await request.json();
        return HttpResponse.json({ preferences: saved });
      }),
    );
    renderRoute(<NotificationSettingsCard />, { path: "/", route: "/" });

    const checkbox = await screen.findByLabelText(/send me text message reminders/i);
    expect(checkbox).toBeChecked();
    // The privacy promise is spelled out before anyone opts in.
    expect(screen.getByText(/never include your therapist's name/i)).toBeInTheDocument();

    await userEvent.setup().click(checkbox);

    await waitFor(() => expect(saved).toEqual({ smsNotificationsEnabled: false }));
    await waitFor(() => expect(checkbox).not.toBeChecked());
  });
});
