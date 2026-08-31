"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon, ICONS } from "@/components/ui/Icon";
import { CommunityEvent } from "@/lib/types";

function toIcsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// RFC 5545 §3.3.11 — backslash-escape these four characters, and turn real
// newlines into the literal two-character sequence "\n".
function escapeIcsText(text: string): string {
  return text.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}

function eventEndIso(event: CommunityEvent): string {
  return event.endsAt ?? new Date(new Date(event.startsAt).getTime() + 60 * 60 * 1000).toISOString();
}

function buildIcs(event: CommunityEvent, publicUrl: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PlanAmWell//Community Hub//EN",
    "BEGIN:VEVENT",
    `UID:${event._id}@planamwell.com`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(event.startsAt)}`,
    `DTEND:${toIcsDate(eventEndIso(event))}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `LOCATION:${escapeIcsText(event.isVirtual ? "Online" : event.location ?? "In person")}`,
    `URL:${publicUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

function buildGoogleCalendarUrl(event: CommunityEvent, publicUrl: string): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toIcsDate(event.startsAt)}/${toIcsDate(eventEndIso(event))}`,
    details: `${event.description}\n\n${publicUrl}`,
    location: event.isVirtual ? "Online" : event.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function EventShareActions({ event, publicUrl }: { event: CommunityEvent; publicUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calendarOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setCalendarOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [calendarOpen]);

  async function handleShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: event.title, text: event.description, url: publicUrl });
        return;
      } catch {
        // Cancelled or unsupported mid-call — fall through to copy-link.
      }
    }
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No Web Share API and no clipboard access — nothing more we can do.
    }
  }

  function handleDownloadIcs() {
    const blob = new Blob([buildIcs(event, publicUrl)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "event"}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setCalendarOpen(false);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={handleShare}>
        <Icon path={ICONS.link} className="h-4 w-4" />
        {copied ? "Link copied!" : "Share"}
      </Button>

      <div className="relative" ref={menuRef}>
        <Button variant="outline" onClick={() => setCalendarOpen((v) => !v)}>
          <Icon path={ICONS.calendar} className="h-4 w-4" />
          Add to Calendar
        </Button>
        {calendarOpen && (
          <div className="absolute left-0 top-full z-10 mt-2 w-56 overflow-hidden rounded-card border border-border bg-card-bg shadow-lg">
            <a
              href={buildGoogleCalendarUrl(event, publicUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 text-sm text-body hover:bg-accent-blue-bg"
              onClick={() => setCalendarOpen(false)}
            >
              Google Calendar
            </a>
            <button
              type="button"
              onClick={handleDownloadIcs}
              className="block w-full px-4 py-3 text-left text-sm text-body hover:bg-accent-blue-bg"
            >
              Apple / Outlook (.ics)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
