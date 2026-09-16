import type { LoginRequest, LoginResponse, PublicUser, RegisterRequest, VerifyOtpRequest } from "@mind-hub/shared";
import { apiFetch } from "../../api/client";

export function registerRequest(input: RegisterRequest) {
  return apiFetch<{ userId: string; message: string }>("/auth/register", { method: "POST", body: input });
}

export function verifyOtpRequest(input: VerifyOtpRequest) {
  return apiFetch<{ message: string }>("/auth/verify-otp", { method: "POST", body: input });
}

export function loginRequest(input: LoginRequest) {
  return apiFetch<LoginResponse>("/auth/login", { method: "POST", body: input });
}

export function refreshRequest(refreshToken: string) {
  return apiFetch<{ tokens: { accessToken: string; refreshToken: string } }>("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
}

export function logoutRequest(refreshToken: string) {
  return apiFetch<void>("/auth/logout", { method: "POST", body: { refreshToken } });
}

export function getMe(accessToken: string) {
  return apiFetch<{ user: PublicUser }>("/users/me", { accessToken });
}
