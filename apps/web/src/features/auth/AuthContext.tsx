import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PublicUser } from "@mind-hub/shared";
import * as authApi from "./authApi";

const REFRESH_TOKEN_STORAGE_KEY = "mindhub_refresh_token";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: PublicUser | null;
  accessToken: string | null;
  status: AuthStatus;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    if (!storedRefreshToken) {
      setStatus("unauthenticated");
      return;
    }

    authApi
      .refreshRequest(storedRefreshToken)
      .then(async (res) => {
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, res.tokens.refreshToken);
        const me = await authApi.getMe(res.tokens.accessToken);
        setAccessToken(res.tokens.accessToken);
        setUser(me.user);
        setStatus("authenticated");
      })
      .catch(() => {
        localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
        setStatus("unauthenticated");
      });
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    const res = await authApi.loginRequest({ phone, password });
    setUser(res.user);
    setAccessToken(res.tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, res.tokens.refreshToken);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    if (storedRefreshToken) {
      await authApi.logoutRequest(storedRefreshToken).catch(() => undefined);
    }
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    setUser(null);
    setAccessToken(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, accessToken, status, login, logout }),
    [user, accessToken, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
