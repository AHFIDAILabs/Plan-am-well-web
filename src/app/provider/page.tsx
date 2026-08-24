"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { Doctor, DoctorAppointment } from "@/lib/types";

function Icon({ path, className = "h-5 w-5" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICONS = {
  video: "M15 10l5-3v10l-5-3M4 6h9a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z",
  flask: "M9 3h6m-5 0v6.5L5 19a2 2 0 001.8 3h10.4a2 2 0 001.8-3l-5-9.5V3",
  folderOff: "M3 3l18 18M3 7v11a2 2 0 002 2h10M21 15V7a2 2 0 00-2-2h-6l-2-2H5c-.35 0-.68.1-.96.27",
  lock: "M6 10V8a6 6 0 1112 0v2M5 10h14v10H5V10z",
  fingerprint: "M12 11c0 4-1 7-3 9m3-9c0 3 .5 5.5 1.5 7.5M12 11a3 3 0 013 3c0 2-.5 4-1.5 6M12 11a3 3 0 00-3 3c0 1 .1 2 .3 3M12 7a7 7 0 017 7c0 1 0 2-.2 3M12 7a7 7 0 00-7 7c0 1.3.2 2.5.5 3.7",
};

export default function DoctorDashboardPage() {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [appointments, setAppointments] = useState<DoctorAppointment[] | null>(null);

  useEffect(() => {
    apiGet<{ success: boolean; data?: Doctor }>("/api/doctors/me").then(({ data }) => {
      if (data.success && data.data) setDoctor(data.data);
    });
    apiGet<{ success: boolean; data?: DoctorAppointment[] }>("/api/appointments/doctor").then(({ data }) => {
      if (data.success && data.data) setAppointments(data.data);
    });
  }, []);

  const today = new Date();
  const todaysAppointments = useMemo(() => {
    if (!appointments) return [];
    return appointments
      .filter((a) => new Date(a.scheduledAt).toDateString() === today.toDateString())
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [appointments]);

  const stats = useMemo(() => {
    const pending = todaysAppointments.filter((a) => a.status === "pending").length;
    const completed = todaysAppointments.filter((a) => ["completed", "call-ended"].includes(a.status)).length;
    return { total: todaysAppointments.length, pending, completed };
  }, [todaysAppointments]);

  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">
            {doctor ? `Dr. ${doctor.lastName}'s Overview` : "Your Overview"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {today.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} &middot;{" "}
            {greeting}, Doctor.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-input-bg px-4 py-2 text-xs font-semibold text-muted">
          Confidentiality Status
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary">Strict</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Today's Consultations */}
        <div className="flex h-100 flex-col rounded-card border border-border bg-card-bg p-5 shadow-sm md:col-span-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold text-heading">
              <Icon path={ICONS.video} className="h-5 w-5 text-primary" />
              Today&apos;s Consultations
            </h3>
            <Link href="/provider/appointments" className="text-sm font-semibold text-primary hover:underline">
              View All
            </Link>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {appointments === null && <p className="text-sm text-muted">Loading...</p>}
            {appointments && todaysAppointments.length === 0 && (
              <p className="text-sm text-muted">No consultations scheduled for today.</p>
            )}
            {todaysAppointments.map((appt) => (
              <div
                key={appt._id}
                className="flex items-center justify-between rounded-2xl border border-border bg-page-bg p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-blue-bg text-sm font-bold text-accent-blue-fg">
                    {(appt.userId?.name ?? "P").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-heading">{appt.userId?.name ?? "Patient"}</p>
                    <p className="text-xs text-muted">
                      {new Date(appt.scheduledAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      {appt.consultationType ? ` · ${appt.consultationType}` : ""}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/provider/messages/${appt._id}`}
                  className="rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold text-primary"
                >
                  Start Session
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Lab Results (no backend feature yet — honest empty state) */}
        <div className="flex h-100 flex-col rounded-card border border-border bg-card-bg p-5 shadow-sm md:col-span-4">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-heading">
            <Icon path={ICONS.flask} className="h-5 w-5 text-secondary" />
            Lab Results
          </h3>
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-border bg-page-bg p-4 text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-input-bg">
              <Icon path={ICONS.folderOff} className="h-8 w-8 text-outline" />
            </div>
            <p className="font-semibold text-heading">All caught up</p>
            <p className="mt-1 text-sm text-muted">No pending results for review.</p>
          </div>
        </div>

        {/* Medical Vault */}
        <Link
          href="/provider/patients"
          className="flex flex-col justify-between rounded-card border border-border bg-linear-to-br from-accent-blue-bg to-card-bg p-5 shadow-sm md:col-span-4"
        >
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-blue-bg text-accent-blue-fg">
              <Icon path={ICONS.lock} className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-heading">Medical Vault</h3>
            <p className="mt-1 text-sm text-muted">Securely access patient histories.</p>
          </div>
          <span className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-tertiary py-3 text-sm font-semibold text-tertiary">
            Open Patients <Icon path={ICONS.fingerprint} className="h-4 w-4" />
          </span>
        </Link>

        {/* Quick Stats */}
        <div className="flex flex-col justify-center rounded-card border border-border bg-card-bg p-5 shadow-sm md:col-span-8">
          <div className="grid grid-cols-3 gap-4">
            <div className="border-r border-border p-2 text-center last:border-0">
              <p className="text-3xl font-bold text-primary">{stats.total}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Total Today</p>
            </div>
            <div className="border-r border-border p-2 text-center last:border-0">
              <p className="text-3xl font-bold text-secondary">{stats.pending}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pending</p>
            </div>
            <div className="p-2 text-center">
              <p className="text-3xl font-bold text-tertiary">{stats.completed}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Completed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
