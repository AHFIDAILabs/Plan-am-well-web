"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Doctor, doctorFullName, doctorImageUrl, formatNextAvailable } from "@/lib/types";

export default function DoctorsListPage() {
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("all");

  useEffect(() => {
    apiGet<{ success: boolean; data?: Doctor[]; message?: string }>("/api/doctors").then(({ data }) => {
      if (data.success && data.data) {
        setDoctors(data.data);
      } else {
        setError(data.message ?? "Could not load doctors.");
      }
    });
  }, []);

  const specialties = useMemo(() => {
    if (!doctors) return [];
    return Array.from(new Set(doctors.map((d) => d.specialization))).sort();
  }, [doctors]);

  const filtered = useMemo(() => {
    if (!doctors) return [];
    const q = query.trim().toLowerCase();
    return doctors.filter((d) => {
      const matchesSpecialty = specialty === "all" || d.specialization === specialty;
      const matchesQuery =
        !q ||
        doctorFullName(d).toLowerCase().includes(q) ||
        d.specialization.toLowerCase().includes(q);
      return matchesSpecialty && matchesQuery;
    });
  }, [doctors, query, specialty]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-heading">Consult a Doctor</h1>
      <p className="mt-1 text-sm text-muted">Browse approved doctors and book an appointment.</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input
            placeholder="Search by name or specialty"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="sm:w-56">
          <Select value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
            <option value="all">All specialties</option>
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!doctors && !error && <p className="mt-6 text-sm text-muted">Loading doctors...</p>}

      {doctors && filtered.length === 0 && (
        <p className="mt-6 text-sm text-muted">No doctors match your search.</p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((doctor) => {
          const imageUrl = doctorImageUrl(doctor);
          return (
            <Link
              key={doctor._id}
              href={`/app/doctors/${doctor._id}`}
              className="rounded-card bg-card-bg shadow-atmospheric p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-accent-pink-bg">
                  {imageUrl ? (
                    // Plain <img>, not next/image — doctor photos can come from
                    // Cloudinary (real signups) or an arbitrary profileImage URL
                    // (seed/legacy data), so the host isn't knowable ahead of time.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt={doctorFullName(doctor)} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-bold text-primary">
                      {doctor.firstName[0]}
                      {doctor.lastName[0]}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-heading">{doctorFullName(doctor)}</p>
                  <p className="truncate text-sm text-muted">{doctor.specialization}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <span>
                  {doctor.yearsOfExperience ? `${doctor.yearsOfExperience} yrs experience` : "Experience not listed"}
                </span>
                {typeof doctor.ratings === "number" && doctor.ratings > 0 && (
                  <span className="font-semibold text-secondary">
                    ★ {doctor.ratings.toFixed(1)}
                    {typeof doctor.reviewCount === "number" && ` (${doctor.reviewCount})`}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted">
                Next available: {formatNextAvailable(doctor.nextAvailable) ?? "No upcoming slots"}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
