"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPut } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { UserProfile } from "@/lib/types";
import { GuestGate } from "@/components/auth/GuestGate";

export default function ProfilePage() {
  return (
    <GuestGate feature="Profile & Privacy">
      <ProfilePageContent />
    </GuestGate>
  );
}

function ProfilePageContent() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    homeAddress: "",
    city: "",
    state: "",
    lga: "",
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiGet<{ success: boolean; data?: UserProfile; message?: string }>("/api/users/me").then(({ data }) => {
      if (data.success && data.data) {
        setProfile(data.data);
        setForm({
          name: data.data.name ?? "",
          phone: data.data.phone ?? "",
          gender: data.data.gender ?? "",
          dateOfBirth: data.data.dateOfBirth ?? "",
          homeAddress: data.data.homeAddress ?? "",
          city: data.data.city ?? "",
          state: data.data.state ?? "",
          lga: data.data.lga ?? "",
        });
      } else {
        setLoadError(data.message ?? "Could not load your profile.");
      }
    });
  }, []);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setSaveError(null);
    const { data } = await apiPut<{ success: boolean; message?: string; data?: UserProfile }>(
      `/api/users/${profile._id}`,
      form
    );
    setSaving(false);
    if (data.success && data.data) {
      setProfile(data.data);
      setSaved(true);
    } else {
      setSaveError(data.message ?? "Could not save your changes.");
    }
  }

  if (loadError) {
    return <p className="text-sm text-red-600">{loadError}</p>;
  }

  if (!profile) {
    return <p className="text-sm text-muted">Loading profile...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-heading">Profile &amp; Privacy</h1>
      <p className="mt-1 text-sm text-muted">
        Keep your details up to date — a complete profile is required before booking an appointment.
      </p>

      <div className="mt-6 max-w-2xl rounded-card bg-card-bg shadow-atmospheric p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Full name" value={form.name} onChange={(e) => update("name", e.target.value)} />
          <Input label="Email" value={user?.email ?? profile.email ?? ""} disabled />
          <Input label="Phone number" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          <Select label="Gender" value={form.gender} onChange={(e) => update("gender", e.target.value)}>
            <option value="">Select...</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </Select>
          <Input
            label="Date of birth"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => update("dateOfBirth", e.target.value)}
          />
          <Input label="Home address" value={form.homeAddress} onChange={(e) => update("homeAddress", e.target.value)} />
          <Input label="City" value={form.city} onChange={(e) => update("city", e.target.value)} />
          <Input label="State" value={form.state} onChange={(e) => update("state", e.target.value)} />
          <Input label="LGA" value={form.lga} onChange={(e) => update("lga", e.target.value)} />
        </div>

        {saveError && <p className="mt-4 text-sm text-red-600">{saveError}</p>}
        {saved && <p className="mt-4 text-sm text-green-700">Profile saved.</p>}

        <Button className="mt-6" loading={saving} onClick={handleSave}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
