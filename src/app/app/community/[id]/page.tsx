"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { GuestGate } from "@/components/auth/GuestGate";
import { useAuth } from "@/context/AuthContext";
import { CommunityEvent } from "@/lib/types";

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
  const [rsvped, setRsvped] = useState(false);

  useEffect(() => {
    apiGet<{ success: boolean; data?: CommunityEvent; message?: string }>(`/api/events/${params.id}`).then(
      ({ data }) => {
        if (data.success && data.data) {
          setEvent(data.data);
        } else {
          setError(data.message ?? "Could not load this event.");
        }
      }
    );
  }, [params.id]);

  function openRsvp() {
    setChosenName(user?.pseudonym ?? "");
    setRsvpError(null);
    setShowRsvp(true);
  }

  async function handleRsvp() {
    if (!chosenName.trim()) {
      setRsvpError("Please enter a name to RSVP with.");
      return;
    }
    setSaving(true);
    setRsvpError(null);

    const { data } = await apiPost<{ success: boolean; message?: string }>(`/api/events/${params.id}/rsvp`, {
      chosenName: chosenName.trim(),
      reminderOptIn,
    });

    setSaving(false);
    if (data.success) {
      setShowRsvp(false);
      setRsvped(true);
    } else {
      setRsvpError(data.message ?? "Could not RSVP to this event.");
    }
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

      <div className="mx-auto mt-4 max-w-xl rounded-card bg-card-bg p-6 shadow-atmospheric">
        {event.category && (
          <span className="inline-block rounded-full bg-accent-blue-bg px-2 py-0.5 text-xs font-semibold text-accent-blue-fg">
            {event.category}
          </span>
        )}
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-heading">{event.title}</h1>

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

        {rsvpError === null && rsvped && <p className="mt-4 text-sm text-green-700">You&apos;re RSVP&apos;d for this event.</p>}

        <div className="mt-6">
          <GuestGate feature="Event RSVP">
            <Button onClick={openRsvp} disabled={rsvped}>
              {rsvped ? "You're going" : "RSVP to this event"}
            </Button>
          </GuestGate>
        </div>
      </div>

      <Modal open={showRsvp} onClose={() => setShowRsvp(false)} title="RSVP">
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

          {rsvpError && <p className="text-sm text-red-600">{rsvpError}</p>}

          <div className="mt-2 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRsvp(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={handleRsvp}>
              Confirm RSVP
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
