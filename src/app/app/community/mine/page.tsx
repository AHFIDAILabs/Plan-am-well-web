"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { GuestGate } from "@/components/auth/GuestGate";
import { MyEventRsvp } from "@/lib/types";

export default function MyEventsPage() {
  const [rsvps, setRsvps] = useState<MyEventRsvp[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ success: boolean; data?: MyEventRsvp[]; message?: string }>("/api/events/mine/rsvps").then(({ data }) => {
      if (data.success && data.data) {
        setRsvps(data.data);
      } else {
        setError(data.message ?? "Could not load your events.");
      }
    });
  }, []);

  return (
    <GuestGate feature="My Events">
      <div>
        <Link href="/app/community" className="text-sm font-semibold text-primary">
          &larr; Back to Community Hub
        </Link>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-heading">My Events</h1>
        <p className="mt-1 text-sm text-muted">Events you&apos;ve RSVP&apos;d to.</p>

        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
        {!rsvps && !error && <p className="mt-6 text-sm text-muted">Loading your events...</p>}
        {rsvps && rsvps.length === 0 && (
          <div className="mt-6 rounded-card bg-card-bg p-6 text-center shadow-atmospheric">
            <p className="text-sm text-muted">You haven&apos;t RSVP&apos;d to any events yet.</p>
            <Link href="/app/community" className="mt-2 inline-block text-sm font-semibold text-primary">
              Browse events &rarr;
            </Link>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {rsvps
            ?.filter((r) => r.eventId)
            .map((r) => {
              const event = r.eventId;
              const isPast = new Date(event.startsAt) < new Date();
              return (
                <Link
                  key={r._id}
                  href={`/app/community/${event._id}`}
                  className="rounded-card bg-card-bg p-4 shadow-atmospheric transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      {event.category && (
                        <span className="inline-block rounded-full bg-accent-blue-bg px-2 py-0.5 text-xs font-semibold text-accent-blue-fg">
                          {event.category}
                        </span>
                      )}
                      <p className="mt-1 font-semibold text-heading">{event.title}</p>
                    </div>
                    {isPast && (
                      <span className="shrink-0 rounded-full bg-accent-gray-bg px-3 py-1 text-xs font-semibold text-accent-gray-fg">
                        Past
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span>
                      {new Date(event.startsAt).toLocaleString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>{event.isVirtual ? "Online" : event.location ?? "In person"}</span>
                    <span>RSVP&apos;d as {r.chosenName}</span>
                  </div>
                </Link>
              );
            })}
        </div>
      </div>
    </GuestGate>
  );
}
