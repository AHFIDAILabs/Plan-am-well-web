"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { Icon, ICONS } from "@/components/ui/Icon";
import { Appointment, MedicationReminder, doctorFullName, doctorImageUrl } from "@/lib/types";

const UPCOMING_STATUSES = ["pending", "confirmed", "confirmed-upcoming", "about-to-start", "in-progress"];

export default function PatientDashboardPage() {
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<Appointment | null | undefined>(undefined);
  const [appointmentError, setAppointmentError] = useState(false);
  const [reminders, setReminders] = useState<MedicationReminder[] | null>(null);
  const [remindersError, setRemindersError] = useState(false);

  useEffect(() => {
    apiGet<{ success: boolean; data?: Appointment[] }>("/api/appointments/my")
      .then(({ data }) => {
        if (!data.success || !data.data) {
          setAppointment(null);
          return;
        }
        const upcoming = data.data
          .filter((a) => UPCOMING_STATUSES.includes(a.status))
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        setAppointment(upcoming[0] ?? null);
      })
      .catch(() => setAppointmentError(true));

    apiGet<{ success: boolean; data?: MedicationReminder[] }>("/api/medication-reminders")
      .then(({ data }) => {
        if (data.success && data.data) {
          setReminders(data.data.filter((r) => r.isActive));
        } else {
          setRemindersError(true);
        }
      })
      .catch(() => setRemindersError(true));
  }, []);

  async function toggleTaken(reminder: MedicationReminder) {
    const path = reminder.takenToday
      ? `/api/medication-reminders/${reminder._id}/unmark-taken`
      : `/api/medication-reminders/${reminder._id}/mark-taken`;
    const { data } = await apiPost<{ success: boolean }>(path);
    if (data.success) {
      setReminders((prev) =>
        prev ? prev.map((r) => (r._id === reminder._id ? { ...r, takenToday: !r.takenToday } : r)) : prev
      );
    }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-heading">
        {greeting}
        {user?.name ? `, ${user.name.split(" ")[0]}` : ""}.
      </h1>
      <p className="mt-1 text-sm text-muted">Here&apos;s what&apos;s happening with your care today.</p>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Left column */}
        <div className="flex flex-col gap-6 md:col-span-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              href="/app/ask-amwell"
              className="flex items-center gap-4 rounded-card border border-border bg-card-bg p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-blue-bg text-accent-blue-fg">
                <Icon path={ICONS.bot} className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-semibold text-heading">Ask AmWell AI</h3>
                <p className="text-sm text-muted">Discreet, 24/7 answers to your questions.</p>
              </div>
            </Link>
            <Link
              href="/app/pharmacy"
              className="flex items-center gap-4 rounded-card border border-border bg-card-bg p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-amber-bg text-accent-amber-fg">
                <Icon path={ICONS.pill} className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-semibold text-heading">Order Products</h3>
                <p className="text-sm text-muted">Delivered in plain, unmarked packaging.</p>
              </div>
            </Link>
          </div>

          <div className="relative overflow-hidden rounded-card bg-primary p-8 text-white">
            <div className="relative z-10 max-w-lg">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                Verified Professionals
              </span>
              <h2 className="mt-4 text-2xl font-bold sm:text-3xl">Consult an Expert Doctor</h2>
              <p className="mt-3 text-sm text-white/90">
                Get confidential, non-judgmental medical advice via text, audio, or video call from certified
                professionals.
              </p>
              <Link href="/app/doctors">
                <Button className="mt-6 bg-white text-primary hover:bg-white/90">
                  Book Now
                  <Icon path={ICONS.arrowRight} className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              href="/app/clinics"
              className="flex flex-col gap-3 rounded-card border-t-4 border-tertiary bg-card-bg p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-heading">Find Your Clinics</h3>
                <Icon path={ICONS.pin} className="h-5 w-5 text-tertiary" />
              </div>
              <p className="flex-1 text-sm text-muted">
                Locate trusted, youth-friendly clinics in your area for in-person support.
              </p>
              <span className="flex w-fit items-center gap-1 text-sm font-semibold text-tertiary">
                Search Map <Icon path={ICONS.chevronRight} className="h-4 w-4" />
              </span>
            </Link>
            <Link
              href="/app/records"
              className="flex flex-col gap-3 rounded-card border-t-4 border-secondary bg-card-bg p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-heading">Encrypted Records</h3>
                <Icon path={ICONS.lock} className="h-5 w-5 text-secondary" />
              </div>
              <p className="flex-1 text-sm text-muted">Your medical history is securely stored and only accessible by you.</p>
              <span className="flex w-fit items-center gap-1 text-sm font-semibold text-secondary">
                View Vault <Icon path={ICONS.chevronRight} className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6 md:col-span-4">
          <div className="rounded-card border border-border bg-card-bg p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-heading">
              <Icon path={ICONS.calendar} className="h-5 w-5 text-primary" />
              Upcoming Appointment
            </h3>

            {appointmentError && <p className="text-sm text-red-600">Couldn&apos;t load your appointments. Try refreshing.</p>}

            {!appointmentError && appointment === undefined && <p className="text-sm text-muted">Loading...</p>}

            {!appointmentError && appointment === null && (
              <div className="text-center">
                <p className="text-sm text-muted">No upcoming appointments.</p>
                <Link href="/app/doctors" className="mt-2 inline-block text-sm font-semibold text-primary">
                  Find a doctor &rarr;
                </Link>
              </div>
            )}

            {appointment && (
              <>
                <div className="mb-4 flex items-center gap-3 rounded-2xl bg-input-bg p-3">
                  {doctorImageUrl(appointment.doctorId) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={doctorImageUrl(appointment.doctorId)!}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-pink-bg text-sm font-bold text-primary">
                      {appointment.doctorId.firstName[0]}
                      {appointment.doctorId.lastName[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-heading">{doctorFullName(appointment.doctorId)}</p>
                    <p className="text-sm text-muted">{appointment.doctorId.specialization}</p>
                  </div>
                </div>
                <div className="mb-4 flex flex-col gap-2 text-sm text-muted">
                  <span className="flex items-center gap-2">
                    <Icon path={ICONS.calendar} className="h-4 w-4" />
                    {new Date(appointment.scheduledAt).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-2">
                    <Icon path={ICONS.clock} className="h-4 w-4" />
                    {new Date(appointment.scheduledAt).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <Link href={`/app/messages/${appointment._id}`}>
                    <Button className="w-full">
                      <Icon path={ICONS.video} className="h-4 w-4" />
                      Join Call
                    </Button>
                  </Link>
                  <Link href={`/app/messages/${appointment._id}`}>
                    <Button variant="outline" className="w-full">
                      <Icon path={ICONS.chat} className="h-4 w-4" />
                      Chat Prior
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>

          <div className="flex-1 rounded-card border border-border bg-card-bg p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-heading">
                <Icon path={ICONS.pill} className="h-5 w-5 text-secondary" />
                Today&apos;s Reminders
              </h3>
              <Link href="/app/reminders" className="text-muted hover:text-primary">
                <Icon path={ICONS.add} className="h-5 w-5" />
              </Link>
            </div>

            {remindersError && <p className="text-sm text-red-600">Couldn&apos;t load your reminders. Try refreshing.</p>}
            {!remindersError && reminders === null && <p className="text-sm text-muted">Loading...</p>}
            {!remindersError && reminders && reminders.length === 0 && (
              <p className="text-sm text-muted">
                No active reminders.{" "}
                <Link href="/app/reminders" className="font-semibold text-primary">
                  Add one &rarr;
                </Link>
              </p>
            )}

            <div className="flex flex-col gap-2">
              {reminders?.map((reminder) => (
                <label
                  key={reminder._id}
                  className={`flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-input-bg ${
                    reminder.takenToday ? "opacity-60" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!reminder.takenToday}
                    onChange={() => toggleTaken(reminder)}
                    className="mt-0.5 h-5 w-5 rounded border-2 border-outline text-primary focus:ring-primary"
                  />
                  <div className={`flex-1 ${reminder.takenToday ? "line-through" : ""}`}>
                    <p className="text-sm font-semibold text-heading">{reminder.displayAlias || reminder.drugName}</p>
                    <p className="text-xs text-muted">{reminder.times.join(", ")}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Link
        href="/app/articles"
        className="mt-6 flex flex-col items-center justify-between gap-4 rounded-card border border-border bg-input-bg p-5 md:flex-row"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-amber-bg text-accent-amber-fg">
            <Icon path={ICONS.people} className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-semibold text-heading">Advocacy &amp; Articles</h4>
            <p className="text-sm text-muted">Join the community driving change in SRHR awareness.</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border-2 border-secondary px-6 py-2 text-sm font-semibold text-secondary">
          Learn More
        </span>
      </Link>
    </div>
  );
}
