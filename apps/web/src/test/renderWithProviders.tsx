import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import type { PublicUser } from "@mind-hub/shared";
import { AuthProvider } from "../features/auth/AuthContext";
import { server } from "./mswServer";
import { API_BASE_URL, testUser } from "./handlers";

export const testTherapistUser: PublicUser = {
  ...testUser,
  id: "22222222-2222-2222-2222-222222222222",
  role: "THERAPIST",
  phone: "+254722222222",
};

/** Starts the next render signed in as `user`, through the real AuthProvider: a stored
 * refresh token plus MSW responses for the refresh and /users/me calls it makes on mount. */
export function signInAs(user: PublicUser = testUser) {
  localStorage.setItem("mindhub_refresh_token", "test-refresh-token");
  server.use(
    http.post(`${API_BASE_URL}/auth/refresh`, () =>
      HttpResponse.json({ tokens: { accessToken: "test-access-token", refreshToken: "test-refresh-token" } }),
    ),
    http.get(`${API_BASE_URL}/users/me`, () => HttpResponse.json({ user })),
  );
}

/** Renders `element` at `route`, matched against `path`, with every app-level provider. */
export function renderRoute(element: ReactElement, { path, route }: { path: string; route: string }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={element} />
            <Route path="*" element={<div>Somewhere else</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}
