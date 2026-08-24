"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QuickExitButton } from "@/components/safety/QuickExitButton";
import { registerSchema, fieldErrors } from "@/lib/validation/auth";

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = registerSchema.safeParse({ name, email, password });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});

    setLoading(true);
    const registerResult = await register(name, email, password);
    setLoading(false);
    if (!registerResult.success) {
      setError(registerResult.message || "Registration failed. Please try again.");
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
          <h1 className="mt-4 text-2xl font-bold text-heading">Create Your Account</h1>
          <p className="mt-1 text-sm text-muted">Private, non-judgmental care starts here</p>
        </div>

        {/* Doctor registration needs its own flow (profile image upload +
            credentials review) — not built yet, so it's surfaced here rather
            than silently missing. */}
        <div className="mb-6 rounded-lg bg-accent-blue-bg px-3.5 py-2.5 text-xs text-accent-blue-fg">
          Registering as a doctor?{" "}
          <Link href="/register/doctor" className="font-bold hover:underline">
            Start your provider application
          </Link>
          .
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            error={errors.name}
          />
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            error={errors.email}
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters, with a letter and a number"
            error={errors.password}
          />
          <Button type="submit" loading={loading} className="w-full">
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Already registered?{" "}
          <Link href="/login" className="font-bold text-primary hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
