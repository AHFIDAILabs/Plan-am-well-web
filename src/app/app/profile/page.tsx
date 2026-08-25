"use client";

import { useEffect, useRef, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiDelete, apiPutForm } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { Icon, ICONS } from "@/components/ui/Icon";
import { UserProfile, userImageUrl } from "@/lib/types";
import { GuestGate } from "@/components/auth/GuestGate";
import { DeleteAccountSection } from "@/components/account/DeleteAccountSection";

function SectionHeader({ icon, title, subtitle }: { icon: keyof typeof ICONS; title: string; subtitle: string }) {
  return (
    <div className="mb-5 flex items-center gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-pink-bg text-primary">
        <Icon path={ICONS[icon]} className="h-6 w-6" />
      </div>
      <div>
        <h2 className="font-bold text-heading">{title}</h2>
        <p className="text-xs text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

// Biometric lock is real (WebAuthn) but genuinely scoped to Medical Records
// only, and lives in the session cookie for this device — not an
// account-wide setting. See BiometricGate.tsx, which this mirrors.
function BiometricLockRow() {
  const [supported, setSupported] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const canUse =
        typeof window !== "undefined" &&
        !!window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable &&
        (await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false));
      setSupported(!!canUse);
      if (!canUse) {
        setChecked(true);
        return;
      }
      const { data } = await apiGet<{ success: boolean; registered?: boolean }>("/api/webauthn").catch(() => ({
        data: { success: false, registered: false } as { success: boolean; registered?: boolean },
      }));
      setRegistered(!!data.registered);
      setChecked(true);
    })();
  }, []);

  async function handleToggle(next: boolean) {
    setBusy(true);
    setError(null);
    try {
      if (next) {
        const { data: optionsRes } = await apiPost<{ success: boolean; options?: any; message?: string }>(
          "/api/webauthn/register/options"
        );
        if (!optionsRes.success || !optionsRes.options) throw new Error(optionsRes.message ?? "Could not start setup");
        const attestation = await startRegistration({ optionsJSON: optionsRes.options });
        const { data: verifyRes } = await apiPost<{ success: boolean; message?: string }>(
          "/api/webauthn/register/verify",
          attestation
        );
        if (!verifyRes.success) throw new Error(verifyRes.message ?? "Could not verify device");
        setRegistered(true);
      } else {
        await apiDelete("/api/webauthn");
        setRegistered(false);
      }
    } catch (err: any) {
      setError(err?.message ?? "Could not update biometric lock.");
    } finally {
      setBusy(false);
    }
  }

  if (!checked || !supported) return null;

  return (
    <div className="flex items-center justify-between rounded-lg p-4 hover:bg-input-bg">
      <div className="flex items-center gap-3">
        <Icon path={ICONS.lock} className="h-5 w-5 text-muted" />
        <div>
          <p className="text-sm font-medium text-heading">Biometric Lock for Medical Records</p>
          <p className="text-xs text-muted">
            Require your device&apos;s fingerprint, face, or PIN before viewing records — this device only.
          </p>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      </div>
      <Toggle checked={registered} onChange={handleToggle} disabled={busy} aria-label="Biometric lock for Medical Records" />
    </div>
  );
}

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

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  function formDataFromFields(): FormData {
    const fd = new FormData();
    for (const [key, value] of Object.entries(form)) {
      fd.append(key, value);
    }
    return fd;
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setSaveError(null);
    const { data } = await apiPutForm<{ success: boolean; message?: string; data?: UserProfile }>(
      `/api/users/${profile._id}`,
      formDataFromFields()
    );
    setSaving(false);
    if (data.success && data.data) {
      setProfile(data.data);
      setSaved(true);
    } else {
      setSaveError(data.message ?? "Could not save your changes.");
    }
  }

  async function handleImageSelected(file: File) {
    if (!profile) return;
    setUploadingImage(true);
    setImageError(null);
    const fd = formDataFromFields();
    fd.append("userImage", file);
    const { data } = await apiPutForm<{ success: boolean; message?: string; data?: UserProfile }>(
      `/api/users/${profile._id}`,
      fd
    );
    setUploadingImage(false);
    if (data.success && data.data) {
      setProfile(data.data);
    } else {
      setImageError(data.message ?? "Could not update your photo.");
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

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploadingImage}
          aria-label="Change profile photo"
          className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full disabled:opacity-70"
        >
          {(() => {
            const imageUrl = userImageUrl(profile);
            return imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-accent-pink-bg text-xl font-bold text-primary">
                {(form.name || user?.name || "?")[0]?.toUpperCase()}
              </div>
            );
          })()}
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
        <div>
          <p className="font-semibold text-heading">{form.name || "Add your name below"}</p>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploadingImage}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Change photo
          </button>
          {imageError && <p className="text-xs text-red-600">{imageError}</p>}
        </div>
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
      </div>

      <div className="mt-6 grid max-w-4xl grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="flex flex-col">
          <SectionHeader icon="shield" title="Privacy Profile" subtitle="Your secure, confidential identity" />

          {profile.pseudonym && (
            <div className="rounded-lg border border-accent-blue-bg bg-accent-blue-bg/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-blue-fg">Current Pseudonym</p>
              <p className="mt-1 text-lg font-bold text-heading">{profile.pseudonym}</p>
              <p className="mt-0.5 text-xs text-muted">Used for community and AI interactions</p>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-1 border-t border-border pt-2">
            <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">Security</p>
            <BiometricLockRow />
          </div>
        </Card>

        <Card>
          <SectionHeader icon="person" title="Personal Information" subtitle="Required before booking an appointment" />
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
        </Card>
      </div>

      <div className="mt-6 max-w-4xl">
        <DeleteAccountSection />
      </div>
    </div>
  );
}
