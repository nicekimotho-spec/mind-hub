import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import { LoginPage } from "./LoginPage";

function renderLoginPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("LoginPage", () => {
  it("shows an error for invalid credentials", async () => {
    renderLoginPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/phone number/i), "0712345678");
    await user.type(screen.getByLabelText(/password/i), "wrongpassword1");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid phone number or password/i);
  });

  it("logs in successfully and navigates to the dashboard", async () => {
    renderLoginPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/phone number/i), "0712345678");
    await user.type(screen.getByLabelText(/password/i), "correctpassword1");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText("Dashboard Page")).toBeInTheDocument();
  });
});
