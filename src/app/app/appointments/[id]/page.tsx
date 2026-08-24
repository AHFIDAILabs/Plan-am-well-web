"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPatch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Appointment, doctorFullName, doctorImageUrl } from "@/lib/types";
import { GuestGate } from "@/components/auth/GuestGate";

const CANCELLABLE_STATUSES = ["pending", "confirmed", "confirmed-upcoming"];

export default function AppointmentDetailPage() {
  return (
    <GuestGate feature="Appointment details">
      <AppointmentDetailPageContent />
    </GuestGate>
  );
}

function AppointmentDetailPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ success: boolean; data?: Appointment; message?: string }>(`/api/appointments/${params.id}`).then(
      ({ data }) => {
        if (data.success && data.data) {
          setAppointment(data.data);
        } else {
          setError(data.message ?? "Could not load this appointment.");
        }
      }
    );
  }, [params.id]);

  async function handleCancel() {
    if (!appointment) return;
    setCancelling(true);
    setCancelError(null);
    const { status, data } = await apiPatch<{ success: boolean; message?: string; data?: Appointment }>(
      `/api/appointments/${appointment._id}`,
      { status: "cancelled" }
    );
    setCancelling(false);
    if (status === 401) {
      router.push("/login");
      return;
    }
    if (data.success && data.data) {
      setAppointment(data.data);
    } else {
      setCancelError(data.message ?? "Could not cancel this appointment.");
    }
  }

  if (error) {
    return (
      <div>
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/app/appointments" className="mt-4 inline-block text-sm font-semibold text-primary">
          &larr; Back to appointments
        </Link>
      </div>
    );
  }

  if (!appointment) {
    return <p className="text-sm text-muted">Loading appointment...</p>;
  }

  const imageUrl = doctorImageUrl(appointment.doctorId);
  const canCancel = CANCELLABLE_STATUSES.includes(appointment.status);

  return (
    <div>
      <Link href="/app/appointments" className="text-sm font-semibold text-primary">
        &larr; Back to appointments
      </Link>

      <div className="mx-auto mt-4 max-w-xl rounded-card bg-card-bg shadow-atmospheric p-6">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-accent-pink-bg">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={doctorFullName(appointment.doctorId)} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-bold text-primary">
                {appointment.doctorId.firstName[0]}
                {appointment.doctorId.lastName[0]}
              </div>
            )}
          </div>
          <div>
            <p className="font-bold text-heading">{doctorFullName(appointment.doctorId)}</p>
            <p className="text-sm text-muted">{appointment.doctorId.specialization}</p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Status</dt>
            <dd className="mt-1 font-semibold capitalize text-heading">{appointment.status.replace(/-/g, " ")}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Type</dt>
            <dd className="mt-1 capitalize text-heading">{appointment.consultationType ?? "Video"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Date &amp; time</dt>
            <dd className="mt-1 text-heading">
              {new Date(appointment.scheduledAt).toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Duration</dt>
            <dd className="mt-1 text-heading">{appointment.duration} min</dd>
          </div>
        </dl>

        {appointment.reason && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase text-muted">Reason for visit</p>
            <p className="mt-1 text-sm text-body">{appointment.reason}</p>
          </div>
        )}

        {cancelError && <p className="mt-4 text-sm text-red-600">{cancelError}</p>}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/app/messages/${appointment._id}`}>
            <Button>Message {doctorFullName(appointment.doctorId)}</Button>
          </Link>
          {canCancel && (
            <Button variant="outline" loading={cancelling} onClick={handleCancel}>
              Cancel appointment
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
