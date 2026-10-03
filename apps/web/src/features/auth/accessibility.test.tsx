import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import { RegisterPage } from "./RegisterPage";
import { LoginPage } from "./LoginPage";
import { VerifyOtpPage } from "./VerifyOtpPage";

/**
 * Regression coverage for the WCAG 1.3.5 (Identify Input Purpose) gaps found during
 * the BUILD_PLAN.md M10 accessibility pass: identity/credential fields need correct
 * `type` and `autoComplete` tokens so browsers, password managers, and assistive tech
 * handle them correctly. getByLabelText succeeding at all also verifies every field
 * has a properly associated <label> — a query that silently fails without one.
 */
describe("RegisterPage accessibility", () => {
  it("phone field is type=tel with autoComplete=tel", () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );
    const phone = screen.getByLabelText(/phone number/i);
    expect(phone).toHaveAttribute("type", "tel");
    expect(phone).toHaveAttribute("autoComplete", "tel");
  });

  it("password field is autoComplete=new-password", () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/^password/i)).toHaveAttribute("autoComplete", "new-password");
  });

  it("full name and email fields declare their autocomplete purpose", () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute("autoComplete", "name");
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("autoComplete", "email");
  });
});

describe("LoginPage accessibility", () => {
  it("password field is autoComplete=current-password (not new-password)", () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(screen.getByLabelText(/password/i)).toHaveAttribute("autoComplete", "current-password");
  });
});

describe("VerifyOtpPage accessibility", () => {
  it("code field is autoComplete=one-time-code", () => {
    render(
      <MemoryRouter>
        <VerifyOtpPage />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/verification code/i)).toHaveAttribute("autoComplete", "one-time-code");
  });
});
