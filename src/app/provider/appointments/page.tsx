"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet, apiPatch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Icon, ICONS } from "@/components/ui/Icon";
import { AppointmentStatus, DoctorAppointment } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
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

const CALL_ELIGIBLE_STATUSES = new Set(["confirmed", "confirmed-upcoming", "about-to-start", "in-progress"]);
// Mirrors app/appointments/page.tsx's own bucketing so "Upcoming"/"Past" mean
// the same thing on both the patient and doctor side of the same appointment.
const ACTIVE_STATUSES = new Set(["confirmed", "confirmed-upcoming", "about-to-start", "in-progress"]);
const TERMINAL_STATUSES = new Set(["completed", "call-ended", "cancelled", "rejected", "expired"]);

type Tab = "pending" | "upcoming" | "past";
const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
];

interface CallStatus {
  isActive: boolean;
  canJoin: boolean;
  canRejoin: boolean;
}

function initials(name?: string): string {
  if (!name) return "P";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "P";
}

function matchesTab(appt: DoctorAppointment, tab: Tab): boolean {
  const now = new Date();
  const scheduledAt = new Date(appt.scheduledAt);
  switch (tab) {
    case "pending":
      return appt.status === "pending";
    case "upcoming":
      return (
        appt.status === "in-progress" ||
        (ACTIVE_STATUSES.has(appt.status) && appt.status !== "confirmed") ||
        (appt.status === "confirmed" && scheduledAt >= now)
      );
    case "past":
      return (
        TERMINAL_STATUSES.has(appt.status) || (appt.status === "confirmed" && scheduledAt < now)
      );
    default:
      return false;
  }
}

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState<DoctorAppointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pending");
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [callStatuses, setCallStatuses] = useState<Record<string, CallStatus>>({});

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!appointments) return;
    let cancelled = false;

    async function pollCallStatuses() {
      const candidates = appointments!.filter((a) => CALL_ELIGIBLE_STATUSES.has(a.status));
      const results = await Promise.all(
        candidates.map((a) =>
          apiGet<{ success: boolean; data?: CallStatus }>(`/api/video/call-status/${a._id}`).then(
            ({ data }) =>
              [a._id, data.success && data.data ? data.data : { isActive: false, canJoin: false, canRejoin: false }] as const
          )
        )
      );
      if (!cancelled) setCallStatuses(Object.fromEntries(results));
    }

    pollCallStatuses();
    const interval = setInterval(pollCallStatuses, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [appointments]);

  function load() {
    apiGet<{ success: boolean; data?: DoctorAppointment[]; message?: string }>("/api/appointments/doctor").then(
      ({ data }) => {
        if (data.success && data.data) {
          setAppointments(data.data);
        } else {
          setError(data.message ?? "Could not load your appointment requests.");
        }
      }
    );
  }

  async function respond(id: string, status: Extract<AppointmentStatus, "confirmed" | "rejected">) {
    setActioningId(id);
    setActionError(null);
    const { data } = await apiPatch<{ success: boolean; message?: string }>(`/api/appointments/${id}`, { status });
    setActioningId(null);
    if (data.success) {
      load();
    } else {
      setActionError(data.message ?? "Could not update this appointment.");
    }
  }

  const pendingCount = useMemo(() => appointments?.filter((a) => a.status === "pending").length ?? 0, [appointments]);
  const filtered = useMemo(() => appointments?.filter((a) => matchesTab(a, tab)) ?? [], [appointments, tab]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-heading">Appointments</h1>
      <p className="mt-1 text-sm text-muted">Review requests and manage your patient consultations.</p>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {actionError && <p className="mt-4 text-sm text-red-600">{actionError}</p>}
      {!appointments && !error && <p className="mt-6 text-sm text-muted">Loading appointments...</p>}

      {appointments && appointments.length > 0 && (
        <div className="mt-4 flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                tab === t.key ? "bg-primary text-on-primary" : "bg-input-bg text-body hover:bg-accent-pink-bg"
              }`}
            >
              {t.label}
              {t.key === "pending" && pendingCount > 0 && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${
                    tab === t.key ? "bg-white/25" : "bg-primary text-on-primary"
                  }`}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {appointments && appointments.length === 0 && (
        <div className="mt-6 rounded-card bg-card-bg p-8 text-center shadow-atmospheric">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-input-bg">
            <Icon path={ICONS.calendar} className="h-7 w-7 text-outline" />
          </div>
          <p className="mt-3 font-semibold text-heading">No appointments yet</p>
          <p className="mt-1 text-sm text-muted">Patient bookings will show up here once they come in.</p>
        </div>
      )}

      {appointments && appointments.length > 0 && filtered.length === 0 && (
        <div className="mt-6 rounded-card bg-card-bg p-8 text-center shadow-atmospheric">
          <p className="text-sm text-muted">No {tab} appointments.</p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {filtered.map((appt) => {
          const call = callStatuses[appt._id];
          const showCallActions = CALL_ELIGIBLE_STATUSES.has(appt.status) && call && (call.isActive || call.canJoin || call.canRejoin);
          // "Join Call"/"Voice" only makes sense once something is actually
          // live (isActive) — otherwise this button starts a fresh ring, so
          // it reads "Call Back" whenever the previous session already
          // ended (canRejoin), instead of implying there's something to
          // join right now.
          const callLabel = call?.isActive ? "Join Call" : call?.canRejoin ? "Call Back" : "Call";
          const voiceLabel = call?.isActive ? "Voice" : call?.canRejoin ? "Call Back" : "Voice";

          return (
            <div
              key={appt._id}
              className="rounded-card bg-card-bg p-4 shadow-atmospheric transition-shadow hover:shadow-md sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-blue-bg text-sm font-bold text-accent-blue-fg">
                    {initials(appt.userId?.name)}
                  </div>
                  <div>
                    <p className="font-semibold text-heading">{appt.userId?.name ?? "Patient"}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Icon path={ICONS.calendar} className="h-3.5 w-3.5" />
                        {new Date(appt.scheduledAt).toLocaleString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon path={ICONS.clock} className="h-3.5 w-3.5" />
                        {appt.duration} min
                      </span>
                      {appt.consultationType && <span className="capitalize">{appt.consultationType}</span>}
                    </div>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                    STATUS_STYLES[appt.status] ?? "bg-accent-gray-bg text-accent-gray-fg"
                  }`}
                >
                  {appt.status.replace(/-/g, " ")}
                </span>
              </div>

              {appt.reason && <p className="mt-3 text-sm text-body">{appt.reason}</p>}

              {appt.status === "pending" ? (
                <div className="mt-4 flex gap-2">
                  <Button
                    loading={actioningId === appt._id}
                    onClick={() => respond(appt._id, "confirmed")}
                    className="h-10 flex-1 text-sm sm:flex-none"
                  >
                    <Icon path={ICONS.check} className="h-4 w-4" />
                    Confirm
                  </Button>
                  <Button
                    variant="outline"
                    loading={actioningId === appt._id}
                    onClick={() => respond(appt._id, "rejected")}
                    className="h-10 flex-1 text-sm sm:flex-none"
                  >
                    <Icon path={ICONS.close} className="h-4 w-4" />
                    Decline
                  </Button>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {showCallActions && (
                    <>
                      <Link
                        href={`/provider/appointments/${appt._id}/call`}
                        className="flex items-center gap-1.5 rounded-full bg-accent-blue-bg px-3.5 py-2 text-xs font-semibold text-accent-blue-fg hover:brightness-95"
                      >
                        <Icon path={ICONS.video} className="h-3.5 w-3.5" />
                        {callLabel}
                      </Link>
                      <Link
                        href={`/provider/appointments/${appt._id}/call?type=audio`}
                        className="flex items-center gap-1.5 rounded-full bg-accent-blue-bg px-3.5 py-2 text-xs font-semibold text-accent-blue-fg hover:brightness-95"
                      >
                        <Icon path={ICONS.mic} className="h-3.5 w-3.5" />
                        {voiceLabel}
                      </Link>
                    </>
                  )}
                  <Link
                    href={`/provider/messages/${appt._id}`}
                    className="flex items-center gap-1.5 rounded-full bg-input-bg px-3.5 py-2 text-xs font-semibold text-body hover:bg-accent-pink-bg hover:text-primary"
                  >
                    <Icon path={ICONS.chat} className="h-3.5 w-3.5" />
                    Message
                  </Link>
                  {appt.userId?._id && (
                    <Link
                      href={`/provider/records/${appt.userId._id}?appointmentId=${appt._id}`}
                      className="flex items-center gap-1.5 rounded-full bg-input-bg px-3.5 py-2 text-xs font-semibold text-body hover:bg-accent-pink-bg hover:text-primary"
                    >
                      <Icon path={ICONS.folder} className="h-3.5 w-3.5" />
                      Medical Record
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
