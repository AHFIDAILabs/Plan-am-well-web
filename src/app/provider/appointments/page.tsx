"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPatch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
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

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState<DoctorAppointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

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

  const pending = appointments?.filter((a) => a.status === "pending") ?? [];
  const others = appointments?.filter((a) => a.status !== "pending") ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-heading">Appointment Requests</h1>
      <p className="mt-1 text-sm text-muted">Review and respond to incoming patient bookings.</p>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {actionError && <p className="mt-4 text-sm text-red-600">{actionError}</p>}
      {!appointments && !error && <p className="mt-6 text-sm text-muted">Loading appointment requests...</p>}

      {appointments && pending.length === 0 && (
        <p className="mt-6 text-sm text-muted">No pending requests right now.</p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {pending.map((appt) => (
          <div key={appt._id} className="rounded-card bg-card-bg shadow-atmospheric p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-heading">{appt.userId?.name ?? "Patient"}</p>
                <p className="text-sm text-muted">
                  {new Date(appt.scheduledAt).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  &middot; {appt.duration} min
                  {appt.consultationType ? ` · ${appt.consultationType}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  loading={actioningId === appt._id}
                  onClick={() => respond(appt._id, "confirmed")}
                >
                  Confirm
                </Button>
                <Button
                  variant="outline"
                  loading={actioningId === appt._id}
                  onClick={() => respond(appt._id, "rejected")}
                >
                  Decline
                </Button>
              </div>
            </div>
            {appt.reason && <p className="mt-2 text-sm text-body">{appt.reason}</p>}
          </div>
        ))}
      </div>

      {others.length > 0 && (
        <>
          <h2 className="mt-10 font-bold text-heading">Other appointments</h2>
          <div className="mt-3 flex flex-col gap-3">
            {others.map((appt) => (
              <div key={appt._id} className="rounded-card bg-card-bg shadow-atmospheric p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-heading">{appt.userId?.name ?? "Patient"}</p>
                    <p className="text-sm text-muted">
                      {new Date(appt.scheduledAt).toLocaleString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        STATUS_STYLES[appt.status] ?? "bg-accent-gray-bg text-accent-gray-fg"
                      }`}
                    >
                      {appt.status.replace(/-/g, " ")}
                    </span>
                    <Link href={`/provider/messages/${appt._id}`} className="text-xs font-semibold text-primary">
                      Message
                    </Link>
                    <Link
                      href={`/provider/records/${appt.userId._id}?appointmentId=${appt._id}`}
                      className="text-xs font-semibold text-primary"
                    >
                      Medical Record
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
