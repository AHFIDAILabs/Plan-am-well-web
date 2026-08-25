"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { GuestGate } from "@/components/auth/GuestGate";
import { logEvent } from "@/lib/analytics";

type ResultState = "checking" | "paid" | "failed";

export default function PaymentCallbackPage() {
  return (
    <GuestGate feature="Payment">
      <PaymentCallbackContent />
    </GuestGate>
  );
}

function PaymentCallbackContent() {
  const params = useParams<{ id: string }>();
  const [result, setResult] = useState<ResultState>("checking");

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      // The webhook is the real source of truth and may take a moment to
      // land after the redirect back here — check a few times before
      // giving up, matching the same pattern used on mobile.
      for (let attempt = 0; attempt < 6; attempt++) {
        if (cancelled) return;
        const { data } = await apiGet<{ success: boolean; data?: { paymentStatus: string } }>(
          `/api/appointments/${params.id}/payment/status`
        );
        if (cancelled) return;
        if (data.success && data.data?.paymentStatus === "paid") {
          logEvent("appointment_booked", {});
          setResult("paid");
          return;
        }
        if (data.success && data.data?.paymentStatus === "failed") {
          setResult("failed");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      if (!cancelled) setResult("failed");
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  return (
    <div className="mx-auto max-w-lg rounded-card bg-card-bg shadow-atmospheric p-8 text-center">
      {result === "checking" && (
        <>
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <h1 className="mt-4 text-xl font-black text-heading">Confirming your payment…</h1>
          <p className="mt-2 text-sm text-muted">This only takes a moment. Please don&apos;t close this page.</p>
        </>
      )}

      {result === "paid" && (
        <>
          <h1 className="text-xl font-black text-heading">Appointment requested</h1>
          <p className="mt-2 text-sm text-muted">
            Payment confirmed — your request has been sent to the doctor. You&apos;ll be notified once it&apos;s
            confirmed.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/app/appointments">
              <Button>View my appointments</Button>
            </Link>
            <Link href="/app/doctors">
              <Button variant="outline">Browse more doctors</Button>
            </Link>
          </div>
        </>
      )}

      {result === "failed" && (
        <>
          <h1 className="text-xl font-black text-heading">Payment not confirmed</h1>
          <p className="mt-2 text-sm text-muted">
            We couldn&apos;t confirm your payment. If you were charged, it will be refunded — otherwise, no charge
            was made.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/app/appointments">
              <Button variant="outline">View my appointments</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
