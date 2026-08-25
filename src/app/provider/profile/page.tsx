"use client";

import { useEffect, useRef, useState } from "react";
import { apiGet, apiPut, apiPutForm } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StarRow } from "@/components/ui/StarRating";
import { Icon, ICONS } from "@/components/ui/Icon";
import { Doctor, DoctorAvailability, WEEKDAYS, Weekday, doctorImageUrl, doctorFullName } from "@/lib/types";
import { DeleteAccountSection } from "@/components/account/DeleteAccountSection";
import { AnalyticsConsentRow } from "@/components/account/AnalyticsConsentRow";

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

  const [reviewsTotal, setReviewsTotal] = useState(0);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

        apiGet<{ success: boolean; data?: { total: number } }>(`/api/reviews/doctor/${data.data._id}?limit=1`).then(
          ({ data: reviewsRes }) => {
            if (reviewsRes.success && reviewsRes.data) setReviewsTotal(reviewsRes.data.total);
          }
        );
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
    const fd = new FormData();
    fd.append("firstName", form.firstName);
    fd.append("lastName", form.lastName);
    fd.append("contactNumber", form.contactNumber);
    fd.append("specialization", form.specialization);
    if (form.yearsOfExperience) fd.append("yearsOfExperience", form.yearsOfExperience);
    fd.append("bio", form.bio);
    const { data } = await apiPutForm<{ success: boolean; message?: string; data?: Doctor }>(
      `/api/doctors/${doctor._id}`,
      fd
    );
    setSavingProfile(false);
    if (data.success && data.data) {
      setDoctor(data.data);
      setProfileSaved(true);
    } else {
      setProfileError(data.message ?? "Could not save your changes.");
    }
  }

  async function handleImageSelected(file: File) {
    if (!doctor) return;
    setUploadingImage(true);
    setImageError(null);
    const fd = new FormData();
    fd.append("doctorImage", file);
    const { data } = await apiPutForm<{ success: boolean; message?: string; data?: Doctor }>(
      `/api/doctors/${doctor._id}`,
      fd
    );
    setUploadingImage(false);
    if (data.success && data.data) {
      setDoctor(data.data);
    } else {
      setImageError(data.message ?? "Could not update your photo.");
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
  const imageUrl = doctorImageUrl(doctor);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-heading">Profile &amp; Approval</h1>
      <p className="mt-1 text-sm text-muted">Manage your public profile and weekly availability.</p>

      <Card className="relative mt-6 max-w-2xl">
        {doctor.status === "approved" && (
          <Badge variant="blue" className="absolute right-6 top-6">
            <Icon path={ICONS.verified} className="h-3.5 w-3.5" /> MDCN Verified
          </Badge>
        )}
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploadingImage}
            aria-label="Change profile photo"
            className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-full disabled:opacity-70"
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={doctorFullName(doctor)} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-accent-pink-bg text-2xl font-bold text-primary">
                {doctor.firstName[0]}
                {doctor.lastName[0]}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
              {uploadingImage ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Icon
                  path={ICONS.image}
                  className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                />
              )}
            </div>
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) handleImageSelected(file);
            }}
          />
          <div className="text-center sm:text-left">
            <p className="text-xl font-bold text-heading">{doctorFullName(doctor)}</p>
            <p className="font-medium text-primary">{doctor.specialization}</p>
            {reviewsTotal > 0 && (
              <div className="mt-1 flex items-center justify-center gap-2 sm:justify-start">
                <StarRow rating={doctor.ratings ?? 0} size="h-4 w-4" />
                <span className="text-sm text-heading">{(doctor.ratings ?? 0).toFixed(1)}</span>
                <span className="text-sm text-muted">
                  ({reviewsTotal} review{reviewsTotal === 1 ? "" : "s"})
                </span>
              </div>
            )}
            {doctor.status !== "approved" && (
              <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.className}`}>
                {statusInfo.label}
              </span>
            )}
            {doctor.status !== "approved" && <p className="mt-1 text-xs text-muted">{statusInfo.hint}</p>}
            {imageError && <p className="mt-1 text-xs text-red-600">{imageError}</p>}
          </div>
        </div>

        {doctor.licenseNumber && (
          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-border pt-5 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-input-bg p-3">
              <p className="text-xs text-muted">License Number</p>
              <p className="font-mono text-sm font-semibold text-heading">{doctor.licenseNumber}</p>
            </div>
            {doctor.yearsOfExperience !== undefined && (
              <div className="rounded-lg border border-border bg-input-bg p-3">
                <p className="text-xs text-muted">Experience</p>
                <p className="text-sm font-semibold text-heading">{doctor.yearsOfExperience} years</p>
              </div>
            )}
          </div>
        )}
      </Card>

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

      <Card className="mt-6 max-w-2xl">
        <p className="mb-1 px-4 pt-1 text-xs font-semibold uppercase tracking-wide text-muted">Data</p>
        <AnalyticsConsentRow />
      </Card>

      <DeleteAccountSection />
    </div>
  );
}
