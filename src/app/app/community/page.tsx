"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { CommunityEvent } from "@/lib/types";
import { EventBanner } from "@/components/community/EventBanner";

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">Community Hub</h1>
          <p className="mt-1 text-sm text-muted">
            Live events, support groups, and community sessions — RSVP with a chosen name.
          </p>
        </div>
        <Link href="/app/community/mine" className="text-sm font-semibold text-primary hover:underline">
          My Events &rarr;
        </Link>
      </div>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {!events && !error && <p className="mt-6 text-sm text-muted">Loading events...</p>}
      {events && events.length === 0 && (
        <div className="mt-6 rounded-card bg-card-bg p-6 text-center shadow-atmospheric">
          <p className="text-sm text-muted">No upcoming events right now — check back soon.</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {events?.map((event) => (
          <Link
            key={event._id}
            href={`/app/community/${event._id}`}
            className="group overflow-hidden rounded-card bg-card-bg shadow-atmospheric transition-shadow hover:shadow-md"
          >
            <div className="relative h-32 w-full">
              <EventBanner
                bannerImage={event.bannerImage}
                bannerPreset={event.bannerPreset}
                className="transition-transform duration-300 group-hover:scale-105"
              />
              {event.category && (
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-heading shadow-sm backdrop-blur-sm">
                  {event.category}
                </span>
              )}
              {!!event.ticketPriceKobo && (
                <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-on-primary shadow-sm">
                  ₦{(event.ticketPriceKobo / 100).toLocaleString()}
                </span>
              )}
            </div>
            <div className="p-4">
              <p className="font-semibold text-heading">{event.title}</p>
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
                {!!event.rsvpCount && (
                  <span className="font-semibold text-tertiary">{event.rsvpCount} going</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
