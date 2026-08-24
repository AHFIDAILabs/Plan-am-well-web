"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QuickExitButton } from "@/components/safety/QuickExitButton";
import { resetPasswordSchema, fieldErrors } from "@/lib/validation/auth";

function ResetPasswordForm() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});

    setLoading(true);
    const resetResult = await resetPassword(token!, password);
    setLoading(false);
    if (resetResult.success) {
      router.push("/login?reset=1");
    } else {
      setError(resetResult.message || "This reset link is invalid or has expired.");
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
          <h1 className="mt-4 text-2xl font-bold text-heading">Set a new password</h1>
        </div>

        {!token ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
            This reset link is missing its token.{" "}
            <Link href="/forgot-password" className="font-bold hover:underline">
              Request a new one
            </Link>
            .
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
                {error}{" "}
                <Link href="/forgot-password" className="font-bold hover:underline">
                  Request a new link
                </Link>
                .
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="New password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters, with a letter and a number"
                error={errors.password}
              />
              <Input
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
              />
              <Button type="submit" loading={loading} className="w-full">
                Reset password
              </Button>
            </form>
          </>
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
