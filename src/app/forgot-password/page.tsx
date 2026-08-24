"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QuickExitButton } from "@/components/safety/QuickExitButton";
import { forgotPasswordSchema, fieldErrors } from "@/lib/validation/auth";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});

    setLoading(true);
    await forgotPassword(email);
    setLoading(false);
    // Always show the same confirmation, whether or not an account exists
    // for this email — matches the backend's deliberate non-revealing
    // behavior, so this page can never be used to check who has an account.
    setSent(true);
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
          <h1 className="mt-4 text-2xl font-bold text-heading">Reset your password</h1>
          <p className="mt-1 text-sm text-muted">Enter the email on your account and we&apos;ll send a reset link.</p>
        </div>

        {sent ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
            If an account exists for that email, we&apos;ve sent a link to reset your password. It expires in 1 hour.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              error={errors.email}
            />
            <Button type="submit" loading={loading} className="w-full">
              Send reset link
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/login" className="font-bold text-primary hover:underline">
            &larr; Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
