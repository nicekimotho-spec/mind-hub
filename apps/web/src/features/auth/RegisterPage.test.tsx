import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RegisterPage } from "./RegisterPage";

function renderRegisterPage(initialEntry = "/register") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-otp" element={<div>Verify OTP Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RegisterPage", () => {
  it("preselects the therapist role when arriving from an 'Apply to join' link", () => {
    renderRegisterPage("/register?role=therapist");
    expect(screen.getByLabelText(/i am a/i)).toHaveValue("THERAPIST");
    expect(screen.getByRole("heading", { name: /join mind hub as a therapist/i })).toBeInTheDocument();
  });

  it("defaults to the client role", () => {
    renderRegisterPage();
    expect(screen.getByLabelText(/i am a/i)).toHaveValue("CLIENT");
  });

  it("shows a validation error for an invalid phone number without calling the API", async () => {
    renderRegisterPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/full name/i), "Jane Client");
    await user.type(screen.getByLabelText(/phone number/i), "12345");
    await user.type(screen.getByLabelText(/^password/i), "abcdefgh12");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/valid kenyan phone number/i);
  });

  it("registers successfully and navigates to the OTP verification page", async () => {
    renderRegisterPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/full name/i), "Jane Client");
    await user.type(screen.getByLabelText(/phone number/i), "0712345678");
    await user.type(screen.getByLabelText(/^password/i), "abcdefgh12");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("Verify OTP Page")).toBeInTheDocument();
  });
});
