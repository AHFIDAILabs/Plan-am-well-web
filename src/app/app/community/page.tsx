"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { CommunityEvent } from "@/lib/types";

export default function CommunityPage() {
  const [events, setEvents] = useState<CommunityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ success: boolean; data?: CommunityEvent[]; message?: string }>("/api/events").then(({ data }) => {
      if (data.success && data.data) {
        setEvents(data.data);
      } else {
        setError(data.message ?? "Could not load events.");
      }
    });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-heading">Community Hub</h1>
      <p className="mt-1 text-sm text-muted">Live events, support groups, and community sessions — RSVP with a chosen name.</p>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {!events && !error && <p className="mt-6 text-sm text-muted">Loading events...</p>}
      {events && events.length === 0 && (
        <div className="mt-6 rounded-card bg-card-bg p-6 text-center shadow-atmospheric">
          <p className="text-sm text-muted">No upcoming events right now — check back soon.</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {events?.map((event) => (
          <Link
            key={event._id}
            href={`/app/community/${event._id}`}
            className="rounded-card bg-card-bg p-4 shadow-atmospheric transition-shadow hover:shadow-md"
          >
            {event.category && (
              <span className="inline-block rounded-full bg-accent-blue-bg px-2 py-0.5 text-xs font-semibold text-accent-blue-fg">
                {event.category}
              </span>
            )}
            <p className="mt-2 font-semibold text-heading">{event.title}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{event.description}</p>
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
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
