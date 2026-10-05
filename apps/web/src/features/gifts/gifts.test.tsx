import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { BookingDetail, GiftVoucherResponse } from "@mind-hub/shared";
import { server } from "../../test/mswServer";
import { API_BASE_URL, testUser } from "../../test/handlers";
import { renderRoute, signInAs, testTherapistUser } from "../../test/renderWithProviders";
import { GiftsPage } from "./GiftsPage";
import { PaymentPanel } from "../bookings/PaymentPanel";

const activeGift: GiftVoucherResponse = {
  id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  code: "ABCDE-FGHJK",
  amountKES: 5000,
  balanceKES: 5000,
  recipientName: "Mama",
  recipientPhone: "+254711000111",
  message: null,
  status: "ACTIVE",
  expiresAt: "2027-10-05T07:00:00.000Z",
  createdAt: "2026-10-05T07:00:00.000Z",
};

describe("GiftsPage", () => {
  it("reuses the same Idempotency-Key when a failed purchase is retried", async () => {
    signInAs();
    const keys: (string | null)[] = [];
    let attempt = 0;
    server.use(
      http.get(`${API_BASE_URL}/gifts/mine`, () => HttpResponse.json({ gifts: [] })),
      http.post(`${API_BASE_URL}/gifts`, ({ request }) => {
        keys.push(request.headers.get("Idempotency-Key"));
        attempt += 1;
        return attempt === 1
          ? HttpResponse.json({ error: { code: "UNKNOWN", message: "Network hiccup" } }, { status: 502 })
          : HttpResponse.json({ gift: { ...activeGift, status: "PENDING_PAYMENT", code: null } }, { status: 202 });
      }),
    );
    renderRoute(<GiftsPage />, { path: "/", route: "/" });
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /pay with m-pesa/i }));
    expect(await screen.findByText(/network hiccup/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /pay with m-pesa/i }));

    await waitFor(() => expect(keys).toHaveLength(2));
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });

  it("validates a custom amount", async () => {
    signInAs();
    server.use(http.get(`${API_BASE_URL}/gifts/mine`, () => HttpResponse.json({ gifts: [] })));
    renderRoute(<GiftsPage />, { path: "/", route: "/" });
    const user = userEvent.setup();

    await user.click(await screen.findByLabelText(/another amount/i));
    await user.type(screen.getByLabelText(/amount \(kes\)/i), "100");
    await user.click(screen.getByRole("button", { name: /pay with m-pesa/i }));

    expect(await screen.findByText(/smallest gift is kes 500/i)).toBeInTheDocument();
  });

  it("shows the code for a paid gift", async () => {
    signInAs();
    server.use(http.get(`${API_BASE_URL}/gifts/mine`, () => HttpResponse.json({ gifts: [activeGift] })));
    renderRoute(<GiftsPage />, { path: "/", route: "/" });

    expect(await screen.findByText("ABCDE-FGHJK")).toBeInTheDocument();
    expect(screen.getByText(/we've texted this code to them/i)).toBeInTheDocument();
  });
});

describe("paying for a booking with a gift code", () => {
  const booking = {
    id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    status: "PENDING_PAYMENT",
    feeKES: 2500,
    reducedFee: false,
    paymentStatus: null,
    clientId: testUser.id,
    therapistId: testTherapistUser.id,
  } as BookingDetail;

  it("redeems the code against the booking", async () => {
    signInAs();
    let redeemed: unknown;
    server.use(
      http.post(`${API_BASE_URL}/gifts/redeem`, async ({ request }) => {
        redeemed = await request.json();
        return HttpResponse.json({ payment: {}, remainingBalanceKES: 2500 });
      }),
    );
    renderRoute(<PaymentPanel booking={booking} />, { path: "/", route: "/" });
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /use it instead/i }));
    await user.type(screen.getByLabelText(/gift code/i), "abcde-fghjk");
    await user.click(screen.getByRole("button", { name: /pay with gift/i }));

    await waitFor(() => expect(redeemed).toEqual({ bookingId: booking.id, code: "abcde-fghjk" }));
  });

  it("shows why a code couldn't be used", async () => {
    signInAs();
    server.use(
      http.post(`${API_BASE_URL}/gifts/redeem`, () =>
        HttpResponse.json(
          { error: { code: "CONFLICT", message: "This gift has KES 1,000 left, which doesn't cover this session's KES 2,500 fee" } },
          { status: 409 },
        ),
      ),
    );
    renderRoute(<PaymentPanel booking={booking} />, { path: "/", route: "/" });
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /use it instead/i }));
    await user.type(screen.getByLabelText(/gift code/i), "ABCDE-FGHJK");
    await user.click(screen.getByRole("button", { name: /pay with gift/i }));

    expect(await screen.findByText(/kes 1,000 left/i)).toBeInTheDocument();
  });
});
