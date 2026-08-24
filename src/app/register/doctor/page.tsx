"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { QuickExitButton } from "@/components/safety/QuickExitButton";
import { doctorRegisterSchema, fieldErrors } from "@/lib/validation/auth";

export default function DoctorRegisterPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    specialization: "",
    licenseNumber: "",
    contactNumber: "",
    yearsOfExperience: "",
    bio: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = doctorRegisterSchema.safeParse(form);
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});

    if (!imageFile) {
      setError("A profile photo is required.");
      return;
    }

    setSubmitting(true);

    const body = new FormData();
    body.append("firstName", form.firstName.trim());
    body.append("lastName", form.lastName.trim());
    body.append("email", form.email.trim());
    body.append("password", form.password);
    body.append("specialization", form.specialization.trim());
    body.append("licenseNumber", form.licenseNumber.trim());
    if (form.contactNumber.trim()) body.append("contactNumber", form.contactNumber.trim());
    if (form.yearsOfExperience.trim()) body.append("yearsOfExperience", form.yearsOfExperience.trim());
    if (form.bio.trim()) body.append("bio", form.bio.trim());
    body.append("doctorImage", imageFile);

    const res = await fetch("/api/auth/register/doctor", { method: "POST", body, credentials: "include" });
    const data = await res.json().catch(() => ({}));

    setSubmitting(false);

    if (data.success) {
      setSubmitted(true);
    } else {
      setError(data.message ?? "Registration failed. Please try again.");
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page-bg px-4 py-12">
        <div className="w-full max-w-md rounded-card bg-card-bg p-8 text-center shadow-atmospheric">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-heading">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="" className="h-8 w-8 object-contain" />
            Plan<span className="text-primary">Am</span><span className="text-secondary">Well</span>
          </Link>
          <h1 className="mt-4 text-xl font-black text-heading">Application submitted</h1>
          <p className="mt-2 text-sm text-muted">
            Thanks for applying to join PlanAmWell. Your profile and credentials are now under review — we&apos;ll
            notify you by email once you&apos;re approved.
          </p>
          <Link href="/" className="mt-6 inline-block text-xs font-bold text-primary hover:underline">
            &larr; Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page-bg px-4 py-12">
      <QuickExitButton className="fixed right-4 top-4" />
      <div className="w-full max-w-xl rounded-card bg-card-bg p-8 shadow-atmospheric">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-heading">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="" className="h-8 w-8 object-contain" />
            Plan<span className="text-primary">Am</span><span className="text-secondary">Well</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-heading">Provider Application</h1>
          <p className="mt-1 text-sm text-muted">Join PlanAmWell as a doctor — your profile is reviewed before approval.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-accent-pink-bg">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted">Photo</div>
              )}
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-semibold text-heading">Profile photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              error={errors.firstName}
            />
            <Input
              label="Last name"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              error={errors.lastName}
            />
          </div>

          <Input
            label="Email address"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="name@example.com"
            error={errors.email}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="At least 8 characters, with a letter and a number"
              error={errors.password}
            />
            <Input
              label="Confirm password"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              error={errors.confirmPassword}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Specialization"
              value={form.specialization}
              onChange={(e) => update("specialization", e.target.value)}
              placeholder="e.g. Gynecology"
              error={errors.specialization}
            />
            <Input
              label="License number"
              value={form.licenseNumber}
              onChange={(e) => update("licenseNumber", e.target.value)}
              error={errors.licenseNumber}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Contact number"
              value={form.contactNumber}
              onChange={(e) => update("contactNumber", e.target.value)}
              error={errors.contactNumber}
            />
            <Input
              label="Years of experience"
              type="number"
              min={0}
              value={form.yearsOfExperience}
              onChange={(e) => update("yearsOfExperience", e.target.value)}
              error={errors.yearsOfExperience}
            />
          </div>

          <Textarea
            label="Bio (optional)"
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
            rows={3}
            placeholder="Tell patients about your practice and experience"
          />

          <Button type="submit" loading={submitting} className="w-full">
            Submit application
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Already approved?{" "}
          <Link href="/login" className="font-bold text-primary hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
