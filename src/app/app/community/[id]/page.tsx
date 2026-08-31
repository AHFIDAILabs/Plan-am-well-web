"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { GuestGate } from "@/components/auth/GuestGate";
import { useAuth } from "@/context/AuthContext";
import { CommunityEvent, buildReferralUrl } from "@/lib/types";
import { EventBanner } from "@/components/community/EventBanner";
import { EventShareActions } from "@/components/community/EventShareActions";

function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function CommunityEventDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();

  const [event, setEvent] = useState<CommunityEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRsvp, setShowRsvp] = useState(false);
  const [chosenName, setChosenName] = useState("");
  const [reminderOptIn, setReminderOptIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);

  function load() {
    apiGet<{ success: boolean; data?: CommunityEvent; message?: string }>(`/api/events/${params.id}`).then(
      ({ data }) => {
        if (data.success && data.data) {
          setEvent(data.data);
        } else {
          setError(data.message ?? "Could not load this event.");
        }
      }
    );
  }

  useEffect(load, [params.id]);

  const isTicketed = !!event?.ticketPriceKobo;
  const rsvpStatus = event?.myRsvp?.status;
  const rsvped = rsvpStatus === "going";
  const awaitingPayment = rsvpStatus === "pending_payment";

  function openRsvp() {
    setChosenName(event?.myRsvp?.chosenName ?? user?.pseudonym ?? "");
    setReminderOptIn(event?.myRsvp?.reminderOptIn ?? false);
    setRsvpError(null);
    setShowRsvp(true);
  }

  async function startTicketPayment() {
    setPaying(true);
    setRsvpError(null);
    const { data } = await apiPost<{ success: boolean; message?: string; data?: { checkoutUrl?: string } }>(
      `/api/events/${params.id}/rsvp/pay`,
      {}
    );
    if (data.success && data.data?.checkoutUrl) {
      window.location.href = data.data.checkoutUrl;
      return;
    }
    setPaying(false);
    setRsvpError(data.message ?? "Could not start payment. Please try again.");
  }

  async function handleRsvp() {
    if (!chosenName.trim()) {
      setRsvpError("Please enter a name to RSVP with.");
      return;
    }
    setSaving(true);
    setRsvpError(null);

    const { data } = await apiPost<{ success: boolean; message?: string; requiresPayment?: boolean }>(
      `/api/events/${params.id}/rsvp`,
      { chosenName: chosenName.trim(), reminderOptIn }
    );

    setSaving(false);
    if (!data.success) {
      setRsvpError(data.message ?? "Could not RSVP to this event.");
      return;
    }

    setShowRsvp(false);
    if (data.requiresPayment) {
      // Reload so event.myRsvp reflects pending_payment, then send the
      // patient straight to checkout — no separate "now pay" click needed.
      load();
      await startTicketPayment();
    } else {
      load();
    }
  }

  async function handleCancelRsvp() {
    setCancelling(true);
    await apiDelete(`/api/events/${params.id}/rsvp`);
    setCancelling(false);
    load();
  }

  if (error) {
    return (
      <div>
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/app/community" className="mt-4 inline-block text-sm font-semibold text-primary">
          &larr; Back to Community Hub
        </Link>
      </div>
    );
  }

  if (!event) {
    return <p className="text-sm text-muted">Loading event...</p>;
  }

  return (
    <div>
      <Link href="/app/community" className="text-sm font-semibold text-primary">
        &larr; Back to Community Hub
      </Link>

      <div className="mx-auto mt-4 max-w-xl overflow-hidden rounded-card bg-card-bg shadow-atmospheric">
        <div className="relative h-48 w-full sm:h-56">
          <EventBanner bannerImage={event.bannerImage} bannerPreset={event.bannerPreset} size="lg" />
          {event.category && (
            <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-heading shadow-sm backdrop-blur-sm">
              {event.category}
            </span>
          )}
          {isTicketed && (
            <span className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-on-primary shadow-sm">
              {formatNaira(event.ticketPriceKobo!)}
            </span>
          )}
        </div>

        <div className="p-6">
        {/* Aggregate count only, never who — a lightweight sense that
            others are here too without exposing anyone's identity. */}
        {!!event.rsvpCount && (
          <span className="text-xs font-semibold text-tertiary">
            {event.rsvpCount} {event.rsvpCount === 1 ? "person" : "people"} going
          </span>
        )}
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-heading">{event.title}</h1>
        {event.organizerName && <p className="mt-1 text-sm text-muted">Hosted by {event.organizerName}</p>}

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Date &amp; time</dt>
            <dd className="mt-1 text-heading">
              {new Date(event.startsAt).toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Where</dt>
            <dd className="mt-1 text-heading">{event.isVirtual ? "Online" : event.location ?? "In person"}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase text-muted">About this event</p>
          <p className="mt-1 text-sm text-body">{event.description}</p>
        </div>

        {rsvped && (
          <p className="mt-4 text-sm text-green-700">
            You&apos;re RSVP&apos;d as <strong>{event.myRsvp?.chosenName}</strong>.
          </p>
        )}
        {awaitingPayment && (
          <p className="mt-4 text-sm text-accent-amber-fg">
            You started an RSVP but haven&apos;t completed payment yet — finish below to secure your spot.
          </p>
        )}

        {rsvpError && <p className="mt-3 text-sm text-red-600">{rsvpError}</p>}

        <div className="mt-6 flex flex-wrap gap-3">
          <GuestGate feature="Event RSVP">
            {awaitingPayment ? (
              <>
                <Button loading={paying} onClick={startTicketPayment}>
                  Complete Payment ({formatNaira(event.ticketPriceKobo!)})
                </Button>
                <Button variant="outline" loading={cancelling} onClick={handleCancelRsvp}>
                  Cancel
                </Button>
              </>
            ) : rsvped ? (
              <>
                {!isTicketed && (
                  <Button variant="outline" onClick={openRsvp}>
                    Edit RSVP
                  </Button>
                )}
                <Button variant="outline" loading={cancelling} onClick={handleCancelRsvp}>
                  Cancel RSVP
                </Button>
              </>
            ) : (
              <Button onClick={openRsvp}>{isTicketed ? `Get Ticket (${formatNaira(event.ticketPriceKobo!)})` : "RSVP to this event"}</Button>
            )}
          </GuestGate>

          {event.registrationUrl && (
            <a
              href={buildReferralUrl(event.registrationUrl, event.referralCode)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-14 items-center justify-center rounded-full border border-tertiary px-6 text-sm font-semibold text-tertiary hover:bg-accent-blue-bg"
            >
              Register with {event.organizerName || "organizer"}
            </a>
          )}
        </div>
        {event.registrationUrl && (
          <p className="mt-2 text-xs text-muted">
            Opens {event.organizerName || "the organizer"}&apos;s own registration page in a new tab — we don&apos;t
            collect or share your details there.
          </p>
        )}

        <div className="mt-4">
          <EventShareActions
            event={event}
            publicUrl={typeof window !== "undefined" ? `${window.location.origin}/events/${event._id}` : ""}
          />
        </div>
        </div>
      </div>

      <Modal open={showRsvp} onClose={() => setShowRsvp(false)} title={isTicketed ? "Get Your Ticket" : "RSVP"}>
        <div className="flex flex-col gap-4">
          <Input
            label="Chosen name (pseudonym)"
            value={chosenName}
            onChange={(e) => setChosenName(e.target.value)}
            placeholder="How should we address you at this event?"
          />
          <label className="flex items-center gap-2 text-sm text-body">
            <input
              type="checkbox"
              checked={reminderOptIn}
              onChange={(e) => setReminderOptIn(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            Remind me before this event starts
          </label>

          {isTicketed && (
            <p className="text-xs text-muted">
              You&apos;ll be taken to payment ({formatNaira(event.ticketPriceKobo!)}) next — your spot is only
              confirmed once payment completes.
            </p>
          )}

          {rsvpError && <p className="text-sm text-red-600">{rsvpError}</p>}

          <div className="mt-2 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRsvp(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={handleRsvp}>
              {isTicketed ? "Continue to Payment" : "Confirm RSVP"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
