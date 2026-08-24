"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

// Several backend routes are verified to require a real account even though
// a guest session can otherwise browse the app (doctor detail/booking,
// checkout, human chat, medical records, family members, notifications,
// order history, profile). Rather than let a guest's request silently 401,
// this shows an upfront "create an account" prompt instead — matching the
// mobile app's own proactive-gating pattern (e.g. ProfileScreen redirecting
// straight to Login for a guest) rather than a reactive error-catch.
export function GuestGate({ feature, children }: { feature: string; children: ReactNode }) {
  const { isAnonymous, loading } = useAuth();

  if (loading) return null;

  if (!isAnonymous) return <>{children}</>;

  return (
    <div className="mx-auto max-w-md rounded-card bg-card-bg shadow-atmospheric p-8 text-center">
      <h1 className="font-bold text-heading">Create a free account</h1>
      <p className="mt-2 text-sm text-muted">
        {feature} needs a PlanAmWell account. It only takes a minute, and the rest of the app is still open to browse.
      </p>
      <Link href="/register">
        <Button className="mt-5">Create free account</Button>
      </Link>
    </div>
  );
}
