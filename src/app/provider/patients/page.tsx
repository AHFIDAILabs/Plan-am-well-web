"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { DoctorAppointment } from "@/lib/types";

interface PatientRoster {
  patientId: string;
  name: string;
  email?: string;
  appointmentCount: number;
  lastAppointmentAt: string;
  mostRecentAppointmentId: string;
}

export default function MyPatientsPage() {
  const [appointments, setAppointments] = useState<DoctorAppointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    apiGet<{ success: boolean; data?: DoctorAppointment[]; message?: string }>("/api/appointments/doctor").then(
      ({ data }) => {
        if (data.success && data.data) {
          setAppointments(data.data);
        } else {
          setError(data.message ?? "Could not load your patients.");
        }
      }
    );
  }, []);

  // Derived client-side from the same appointment data already used by
  // /provider/appointments — no dedicated "patients" endpoint exists on the
  // backend, and a doctor's appointment volume is small enough that grouping
  // here is simpler and safer than adding new backend aggregation for this.
  const patients = useMemo<PatientRoster[]>(() => {
    if (!appointments) return [];
    const byPatient = new Map<string, PatientRoster>();

    for (const appt of appointments) {
      if (!appt.userId?._id) continue;
      const existing = byPatient.get(appt.userId._id);
      const scheduledAt = appt.scheduledAt;

      if (!existing) {
        byPatient.set(appt.userId._id, {
          patientId: appt.userId._id,
          name: appt.userId.name ?? "Patient",
          email: appt.userId.email,
          appointmentCount: 1,
          lastAppointmentAt: scheduledAt,
          mostRecentAppointmentId: appt._id,
        });
      } else {
        existing.appointmentCount += 1;
        if (new Date(scheduledAt) > new Date(existing.lastAppointmentAt)) {
          existing.lastAppointmentAt = scheduledAt;
          existing.mostRecentAppointmentId = appt._id;
        }
      }
    }

    return Array.from(byPatient.values()).sort(
      (a, b) => new Date(b.lastAppointmentAt).getTime() - new Date(a.lastAppointmentAt).getTime()
    );
  }, [appointments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => p.name.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q));
  }, [patients, query]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-heading">My Patients</h1>
      <p className="mt-1 text-sm text-muted">Everyone who has booked an appointment with you.</p>

      <div className="mt-4 max-w-sm">
        <Input placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {!appointments && !error && <p className="mt-6 text-sm text-muted">Loading...</p>}
      {appointments && filtered.length === 0 && (
        <p className="mt-6 text-sm text-muted">
          {patients.length === 0 ? "No patients yet." : "No patients match your search."}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <div key={p.patientId} className="rounded-card bg-card-bg shadow-atmospheric p-4">
            <p className="font-semibold text-heading">{p.name}</p>
            {p.email && <p className="text-sm text-muted">{p.email}</p>}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span>
                {p.appointmentCount} appointment{p.appointmentCount !== 1 ? "s" : ""}
              </span>
              <span>Last visit: {new Date(p.lastAppointmentAt).toLocaleDateString()}</span>
            </div>
            <div className="mt-3 flex gap-3 text-sm font-semibold text-primary">
              <Link href={`/provider/messages/${p.mostRecentAppointmentId}`}>Message</Link>
              <Link href={`/provider/records/${p.patientId}?appointmentId=${p.mostRecentAppointmentId}`}>
                Medical Record
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
