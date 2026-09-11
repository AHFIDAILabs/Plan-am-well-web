"use client";

import { useState } from "react";
import Link from "next/link";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { QuickExitButton } from "@/components/safety/QuickExitButton";
import { deleteAccountByCredentialsSchema, fieldErrors } from "@/lib/validation/auth";

// Public, no-login account-deletion page — required by Google Play's account
// deletion policy for any app that supports account creation. Deliberately
// outside proxy.ts's /app/:path* auth gate so it works for someone who no
// longer has the app installed or can't sign in. Identity is confirmed with
// email + password (the same trust level as logging in), which is all a
// browser session with no app-issued token can present.
export default function DeleteAccountPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = deleteAccountByCredentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setConfirming(true);
  }

  async function handleConfirmDelete() {
    setLoading(true);
    const { data } = await apiPost<{ success: boolean; message?: string }>("/api/auth/delete-by-credentials", {
      email,
      password,
    });
    setLoading(false);
    setConfirming(false);
    setResult({
      success: data.success,
      message: data.message ?? (data.success ? "Account deleted successfully." : "Something went wrong."),
    });
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
          <h1 className="mt-4 text-2xl font-bold text-heading">Delete your account</h1>
          <p className="mt-1 text-sm text-muted">
            Permanently delete your PlanAmWell account and all associated data — appointments, chat history,
            medical records, and RSVPs. This cannot be undone.
          </p>
        </div>

        {result ? (
          <div
            className={`rounded-lg border px-3.5 py-3 text-sm ${
              result.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {result.message}
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
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your account password"
              error={errors.password}
            />
            <Button type="submit" className="w-full bg-red-600 text-white hover:bg-red-700">
              Delete My Account
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/login" className="font-bold text-primary hover:underline">
            &larr; Back to sign in
          </Link>
        </p>
      </div>

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Are you sure?">
        <p className="text-sm text-body">
          This will permanently delete the account for <strong>{email}</strong> and everything tied to it —
          appointments, chat and consultation history, medical records, and community RSVPs. There is no way to
          recover this afterward.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirming(false)} disabled={loading}>
            Cancel
          </Button>
          <Button loading={loading} onClick={handleConfirmDelete} className="bg-red-600 text-white hover:bg-red-700">
            Yes, Delete Permanently
          </Button>
        </div>
      </Modal>
    </div>
  );
}
