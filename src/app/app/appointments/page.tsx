"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { Appointment, doctorFullName } from "@/lib/types";
import { GuestGate } from "@/components/auth/GuestGate";

const STATUS_STYLES: Record<string, string> = {
  "awaiting-payment": "bg-accent-amber-bg text-accent-amber-fg",
  pending: "bg-accent-amber-bg text-accent-amber-fg",
  confirmed: "bg-accent-blue-bg text-accent-blue-fg",
  "confirmed-upcoming": "bg-accent-blue-bg text-accent-blue-fg",
  "about-to-start": "bg-accent-blue-bg text-accent-blue-fg",
  "in-progress": "bg-accent-blue-bg text-accent-blue-fg",
  completed: "bg-accent-gray-bg text-accent-gray-fg",
  "call-ended": "bg-accent-gray-bg text-accent-gray-fg",
  cancelled: "bg-accent-pink-bg text-accent-pink-fg",
  rejected: "bg-accent-pink-bg text-accent-pink-fg",
  expired: "bg-accent-gray-bg text-accent-gray-fg",
  rescheduled: "bg-accent-amber-bg text-accent-amber-fg",
};

export default function AppointmentsPage() {
  return (
    <GuestGate feature="My Appointments">
      <AppointmentsPageContent />
    </GuestGate>
  );
}

type Tab = "upcoming" | "pending" | "past";
const TABS: Tab[] = ["upcoming", "pending", "past"];

function getTimeUntil(date: Date): string {
  const diff = date.getTime() - Date.now();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `in ${days} day${days > 1 ? "s" : ""}`;
  if (hours > 0) return `in ${hours} hour${hours > 1 ? "s" : ""}`;
  if (minutes > 0) return `in ${minutes} min${minutes > 1 ? "s" : ""}`;
  return "now";
}

function matchesTab(appt: Appointment, tab: Tab): boolean {
  const now = new Date();
  const scheduledAt = new Date(appt.scheduledAt);
  switch (tab) {
    case "upcoming":
      return appt.status === "confirmed" && scheduledAt >= now;
    case "pending":
      return appt.status === "pending" || appt.status === "awaiting-payment";
    case "past":
      return (
        appt.status === "completed" ||
        appt.status === "cancelled" ||
        appt.status === "rejected" ||
        appt.status === "expired" ||
        (appt.status === "confirmed" && scheduledAt < now)
      );
    default:
      return false;
  }
}

function AppointmentsPageContent() {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");

  useEffect(() => {
    apiGet<{ success: boolean; data?: Appointment[]; message?: string }>("/api/appointments/my").then(({ data }) => {
      if (data.success && data.data) {
        setAppointments(data.data);
      } else {
        setError(data.message ?? "Could not load your appointments.");
      }
    });
  }, []);

  const filtered = appointments?.filter((a) => matchesTab(a, tab)) ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-heading">My Appointments</h1>
      <p className="mt-1 text-sm text-muted">Upcoming and past consultations.</p>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {appointments && appointments.length > 0 && (
        <div className="mt-4 flex gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                tab === t ? "bg-primary text-white" : "bg-input-bg text-body hover:border-primary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {!appointments && !error && <p className="mt-6 text-sm text-muted">Loading appointments...</p>}
      {appointments && appointments.length === 0 && (
        <div className="mt-6 rounded-card bg-card-bg shadow-atmospheric p-6 text-center">
          <p className="text-sm text-muted">You have no appointments yet.</p>
          <Link href="/app/doctors" className="mt-2 inline-block text-sm font-semibold text-primary">
            Find a doctor &rarr;
          </Link>
        </div>
      )}
      {appointments && appointments.length > 0 && filtered.length === 0 && (
        <p className="mt-6 text-sm text-muted">No {tab} appointments.</p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {filtered.map((appt) => (
          <Link
            key={appt._id}
            href={`/app/appointments/${appt._id}`}
            className="rounded-card bg-card-bg shadow-atmospheric p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-heading">{doctorFullName(appt.doctorId)}</p>
                <p className="text-sm text-muted">{appt.doctorId.specialization}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  STATUS_STYLES[appt.status] ?? "bg-accent-gray-bg text-accent-gray-fg"
                }`}
              >
                {appt.status.replace(/-/g, " ")}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span>
                {new Date(appt.scheduledAt).toLocaleString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              <span>{appt.duration} min</span>
              {appt.consultationType && <span className="capitalize">{appt.consultationType}</span>}
              {tab === "upcoming" && (
                <span className="font-semibold text-green-700">{getTimeUntil(new Date(appt.scheduledAt))}</span>
              )}
            </div>
            {appt.reason && <p className="mt-2 text-sm text-body">{appt.reason}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
