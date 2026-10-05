import { http, HttpResponse } from "msw";
import type { LoginResponse, PublicUser } from "@mind-hub/shared";

export const API_BASE_URL = "http://localhost:4000/api/v1";

export const testUser: PublicUser = {
  id: "11111111-1111-1111-1111-111111111111",
  role: "CLIENT",
  phone: "+254712345678",
  email: null,
  status: "ACTIVE",
  phoneVerified: true,
};

export const handlers = [
  http.post(`${API_BASE_URL}/auth/register`, () =>
    HttpResponse.json({ userId: testUser.id, message: "Registered" }, { status: 201 }),
  ),

  http.post(`${API_BASE_URL}/auth/verify-otp`, () => HttpResponse.json({ message: "Phone verified" })),

  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { phone: string; password: string };
    if (body.password !== "correctpassword1") {
      return HttpResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid phone number or password" } },
        { status: 401 },
      );
    }
    const response: LoginResponse = {
      user: testUser,
      tokens: { accessToken: "test-access-token", refreshToken: "test-refresh-token" },
    };
    return HttpResponse.json(response);
  }),

  http.post(`${API_BASE_URL}/auth/refresh`, () =>
    HttpResponse.json({ error: { code: "UNAUTHORIZED", message: "Invalid refresh token" } }, { status: 401 }),
  ),

  http.get(`${API_BASE_URL}/users/me`, () => HttpResponse.json({ user: testUser })),
];
