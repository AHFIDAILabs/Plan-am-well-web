"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QuickExitButton } from "@/components/safety/QuickExitButton";
import { loginSchema, fieldErrors } from "@/lib/validation/auth";

function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const justReset = searchParams.get("reset") === "1";

  const [role, setRole] = useState<"User" | "Doctor">("User");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPendingApproval(false);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});

    setLoading(true);
    const loginResult = await login(email, password, role);
    setLoading(false);
    if (!loginResult.success) {
      if (loginResult.pendingApproval) {
        setPendingApproval(true);
      } else {
        setError(loginResult.message || "Login failed. Please check your details and try again.");
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page-bg px-4 py-12">
      <QuickExitButton className="fixed right-4 top-4" />
      <div className="w-full max-w-md rounded-card bg-card-bg p-8 shadow-atmospheric">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-heading">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="" className="h-8 w-8 object-contain" />
            Plan<span className="text-primary">Am</span><span className="text-secondary">Well</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-heading">Welcome Back</h1>
          <p className="mt-1 text-sm text-muted">Sign in to your confidential telehealth portal</p>
        </div>

        {justRegistered && (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
            Account created — sign in to continue.
          </div>
        )}
        {justReset && (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
            Password reset — sign in with your new password.
          </div>
        )}

        <div className="mb-6 flex rounded-full bg-accent-gray-bg p-1">
          <button
            type="button"
            onClick={() => setRole("User")}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition-all ${
              role === "User" ? "bg-primary text-white shadow-sm" : "text-muted"
            }`}
          >
            Patient
          </button>
          <button
            type="button"
            onClick={() => setRole("Doctor")}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition-all ${
              role === "Doctor" ? "bg-primary text-white shadow-sm" : "text-muted"
            }`}
          >
            Doctor
          </button>
        </div>

        {pendingApproval && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs font-medium text-amber-800">
            Your provider profile is still under review. You&apos;ll be able to sign in once PlanAmWell approves your
            credentials — usually within 1–2 business days.
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            error={errors.email}
          />
          <div>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              error={errors.password}
            />
            <Link href="/forgot-password" className="mt-1.5 inline-block text-xs font-semibold text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" loading={loading} className="w-full">
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-bold text-primary hover:underline">
            Register for free
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
