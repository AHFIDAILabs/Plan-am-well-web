"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPut } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Doctor, DoctorAvailability, WEEKDAYS, Weekday } from "@/lib/types";

const SLOT_DURATION_OPTIONS = [15, 30, 45, 60];

const STATUS_COPY: Record<Doctor["status"], { label: string; className: string; hint: string }> = {
  submitted: {
    label: "Submitted",
    className: "bg-accent-amber-bg text-accent-amber-fg",
    hint: "Your application has been received and is awaiting review.",
  },
  reviewing: {
    label: "Under review",
    className: "bg-accent-blue-bg text-accent-blue-fg",
    hint: "Our team is currently reviewing your credentials.",
  },
  approved: {
    label: "Approved",
    className: "bg-green-100 text-green-700",
    hint: "You're approved and visible to patients.",
  },
  rejected: {
    label: "Not approved",
    className: "bg-accent-pink-bg text-accent-pink-fg",
    hint: "Your application was not approved. Contact support for details.",
  },
};

interface DaySchedule {
  enabled: boolean;
  from: string;
  to: string;
}

type AvailMap = Record<Weekday, DaySchedule>;

function availabilityToForm(availability?: DoctorAvailability): { avail: AvailMap; slotDuration: number } {
  const avail = {} as AvailMap;
  for (const day of WEEKDAYS) {
    const slot = availability?.[day];
    avail[day] = slot ? { enabled: true, from: slot.from, to: slot.to } : { enabled: false, from: "09:00", to: "17:00" };
  }
  return { avail, slotDuration: availability?.slotDuration ?? 30 };
}

export default function DoctorProfilePage() {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    contactNumber: "",
    specialization: "",
    yearsOfExperience: "",
    bio: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const [avail, setAvail] = useState<AvailMap | null>(null);
  const [slotDuration, setSlotDuration] = useState(30);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilitySaved, setAvailabilitySaved] = useState(false);

  useEffect(() => {
    apiGet<{ success: boolean; data?: Doctor; message?: string }>("/api/doctors/me").then(({ data }) => {
      if (data.success && data.data) {
        setDoctor(data.data);
        setForm({
          firstName: data.data.firstName ?? "",
          lastName: data.data.lastName ?? "",
          contactNumber: data.data.contactNumber ?? "",
          specialization: data.data.specialization ?? "",
          yearsOfExperience: data.data.yearsOfExperience?.toString() ?? "",
          bio: data.data.bio ?? "",
        });
        const { avail: a, slotDuration: d } = availabilityToForm(data.data.availability);
        setAvail(a);
        setSlotDuration(d);
      } else {
        setLoadError(data.message ?? "Could not load your profile.");
      }
    });
  }, []);

  function updateForm<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setProfileSaved(false);
  }

  async function handleSaveProfile() {
    if (!doctor) return;
    setSavingProfile(true);
    setProfileError(null);
    const { data } = await apiPut<{ success: boolean; message?: string; data?: Doctor }>(
      `/api/doctors/${doctor._id}`,
      {
        ...form,
        yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : undefined,
      }
    );
    setSavingProfile(false);
    if (data.success && data.data) {
      setDoctor(data.data);
      setProfileSaved(true);
    } else {
      setProfileError(data.message ?? "Could not save your changes.");
    }
  }

  function toggleDay(day: Weekday) {
    setAvail((prev) => (prev ? { ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } } : prev));
    setAvailabilitySaved(false);
  }

  function updateDayTime(day: Weekday, field: "from" | "to", value: string) {
    setAvail((prev) => (prev ? { ...prev, [day]: { ...prev[day], [field]: value } } : prev));
    setAvailabilitySaved(false);
  }

  async function handleSaveAvailability() {
    if (!avail) return;
    setSavingAvailability(true);
    setAvailabilityError(null);

    const payload: DoctorAvailability = { slotDuration };
    for (const day of WEEKDAYS) {
      if (avail[day].enabled) {
        payload[day] = { from: avail[day].from, to: avail[day].to };
      }
    }

    const { data } = await apiPut<{ success: boolean; message?: string; data?: Doctor }>("/api/doctors/availability", {
      availability: payload,
    });
    setSavingAvailability(false);
    if (data.success) {
      setAvailabilitySaved(true);
    } else {
      setAvailabilityError(data.message ?? "Could not save your availability.");
    }
  }

  if (loadError) {
    return <p className="text-sm text-red-600">{loadError}</p>;
  }

  if (!doctor || !avail) {
    return <p className="text-sm text-muted">Loading profile...</p>;
  }

  const statusInfo = STATUS_COPY[doctor.status];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-heading">Profile &amp; Approval</h1>
      <p className="mt-1 text-sm text-muted">Manage your public profile and weekly availability.</p>

      <div className="mt-4 flex items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
        <p className="text-sm text-muted">{statusInfo.hint}</p>
      </div>

      <div className="mt-6 max-w-2xl rounded-card bg-card-bg shadow-atmospheric p-6">
        <h2 className="font-bold text-heading">Profile details</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="First name" value={form.firstName} onChange={(e) => updateForm("firstName", e.target.value)} />
          <Input label="Last name" value={form.lastName} onChange={(e) => updateForm("lastName", e.target.value)} />
          <Input
            label="Contact number"
            value={form.contactNumber}
            onChange={(e) => updateForm("contactNumber", e.target.value)}
          />
          <Input
            label="Specialization"
            value={form.specialization}
            onChange={(e) => updateForm("specialization", e.target.value)}
          />
          <Input
            label="Years of experience"
            type="number"
            min={0}
            value={form.yearsOfExperience}
            onChange={(e) => updateForm("yearsOfExperience", e.target.value)}
          />
        </div>
        <div className="mt-4">
          <Textarea
            label="Bio"
            value={form.bio}
            onChange={(e) => updateForm("bio", e.target.value)}
            rows={4}
            placeholder="Tell patients about your practice and experience"
          />
        </div>

        {profileError && <p className="mt-4 text-sm text-red-600">{profileError}</p>}
        {profileSaved && <p className="mt-4 text-sm text-green-700">Profile saved.</p>}

        <Button className="mt-6" loading={savingProfile} onClick={handleSaveProfile}>
          Save profile
        </Button>
      </div>

      <div className="mt-6 max-w-2xl rounded-card bg-card-bg shadow-atmospheric p-6">
        <h2 className="font-bold text-heading">Weekly availability</h2>
        <p className="mt-1 text-sm text-muted">
          Patients can only book slots on the days and hours you set here. Leave a day off if you don&apos;t see
          patients then.
        </p>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold text-heading">Appointment slot length</label>
          <div className="flex gap-2">
            {SLOT_DURATION_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  setSlotDuration(opt);
                  setAvailabilitySaved(false);
                }}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  slotDuration === opt
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-input-bg text-body hover:border-primary"
                }`}
              >
                {opt} min
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {WEEKDAYS.map((day) => {
            const slot = avail[day];
            return (
              <div
                key={day}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 ${
                  slot.enabled ? "bg-card-bg" : "bg-accent-gray-bg"
                }`}
              >
                <label className="flex items-center gap-2 text-sm font-semibold text-heading">
                  <input
                    type="checkbox"
                    checked={slot.enabled}
                    onChange={() => toggleDay(day)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  {day}
                </label>
                {slot.enabled ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={slot.from}
                      onChange={(e) => updateDayTime(day, "from", e.target.value)}
                      className="rounded-lg border border-border bg-input-bg px-2.5 py-1.5 text-xs text-heading focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-xs text-muted">to</span>
                    <input
                      type="time"
                      value={slot.to}
                      onChange={(e) => updateDayTime(day, "to", e.target.value)}
                      className="rounded-lg border border-border bg-input-bg px-2.5 py-1.5 text-xs text-heading focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-muted">Unavailable</span>
                )}
              </div>
            );
          })}
        </div>

        {availabilityError && <p className="mt-4 text-sm text-red-600">{availabilityError}</p>}
        {availabilitySaved && <p className="mt-4 text-sm text-green-700">Availability saved.</p>}

        <Button className="mt-6" loading={savingAvailability} onClick={handleSaveAvailability}>
          Save availability
        </Button>
      </div>
    </div>
  );
}
