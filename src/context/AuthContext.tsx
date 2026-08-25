"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

export interface SessionUser {
  id: string;
  role: "User" | "Doctor" | "Admin";
  name?: string;
  email?: string;
  pseudonym?: string;
}

interface LoginResult {
  success: boolean;
  message?: string;
  pendingApproval?: boolean;
}

interface AuthContextValue {
  user: SessionUser | null;
  isAnonymous: boolean;
  loading: boolean;
  login: (email: string, password: string, role: "User" | "Doctor") => Promise<LoginResult>;
  register: (name: string, email: string, password: string) => Promise<LoginResult>;
  continueAsGuest: (redirectTo?: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<LoginResult>;
  resetPassword: (token: string, password: string) => Promise<LoginResult>;
  deleteAccount: (password: string) => Promise<LoginResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    apiGet<{ success: boolean; user: SessionUser | null; isAnonymous?: boolean }>("/api/auth/me")
      .then(({ data }) => {
        setUser(data.user ?? null);
        setIsAnonymous(!!data.isAnonymous);

        // Pseudonym is display-layer only and only ever generated/shown for
        // patient accounts — fetched separately since the login/session
        // cookie snapshot doesn't carry it (it's lazily generated server-side
        // on first profile fetch, not at login time).
        if (data.user && data.user.role === "User") {
          apiGet<{ success: boolean; data?: { pseudonym?: string } }>("/api/users/me").then(({ data: profile }) => {
            if (profile.success && profile.data?.pseudonym) {
              setUser((u) => (u ? { ...u, pseudonym: profile.data!.pseudonym } : u));
            }
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string, role: "User" | "Doctor") => {
    const { data } = await apiPost<{ success: boolean; message?: string; pendingApproval?: boolean; user?: SessionUser }>(
      "/api/auth/login",
      { email, password, role }
    );
    if (data.success && data.user) {
      setUser(data.user);
      setIsAnonymous(false);
      router.push(data.user.role === "Doctor" ? "/provider" : "/app");
      return { success: true };
    }
    return { success: false, message: data.message, pendingApproval: data.pendingApproval };
  }, [router]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { data } = await apiPost<{ success: boolean; message?: string; user?: SessionUser; autoLoginFailed?: boolean }>(
      "/api/auth/register",
      { name, email, password }
    );
    if (data.success && data.user) {
      setUser(data.user);
      setIsAnonymous(false);
      router.push("/app");
      return { success: true };
    }
    if (data.success && data.autoLoginFailed) {
      router.push("/login?registered=1");
      return { success: true };
    }
    return { success: false, message: data.message };
  }, [router]);

  const continueAsGuest = useCallback(async (redirectTo: string = "/app") => {
    const { data } = await apiPost<{ success: boolean; message?: string }>("/api/auth/guest");
    if (data.success) {
      setUser(null);
      setIsAnonymous(true);
      router.push(redirectTo);
      return { success: true };
    }
    return { success: false, message: data.message ?? "Could not start browsing as a guest." };
  }, [router]);

  const logout = useCallback(async () => {
    await apiPost("/api/auth/logout");
    setUser(null);
    setIsAnonymous(false);
    router.push("/");
  }, [router]);

  const forgotPassword = useCallback(async (email: string) => {
    const { data } = await apiPost<{ success: boolean; message?: string }>("/api/auth/forgot-password", { email });
    return { success: data.success, message: data.message };
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    const { data } = await apiPost<{ success: boolean; message?: string }>("/api/auth/reset-password", { token, password });
    return { success: data.success, message: data.message };
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    const { data } = await apiDelete<{ success: boolean; message?: string }>("/api/auth/me", { password });
    if (data.success) {
      setUser(null);
      setIsAnonymous(false);
      router.push("/");
    }
    return { success: data.success, message: data.message };
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAnonymous,
        loading,
        login,
        register,
        continueAsGuest,
        logout,
        forgotPassword,
        resetPassword,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
