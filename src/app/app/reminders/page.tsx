"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MedicationReminder } from "@/lib/types";
import { GuestGate } from "@/components/auth/GuestGate";

const FREQUENCIES: { value: MedicationReminder["frequency"]; label: string }[] = [
  { value: "once_daily", label: "Once daily" },
  { value: "twice_daily", label: "Twice daily" },
  { value: "three_times_daily", label: "Three times daily" },
  { value: "four_times_daily", label: "Four times daily" },
  { value: "as_needed", label: "As needed" },
];

const EMPTY_FORM = {
  drugName: "",
  dosage: "",
  frequency: "once_daily" as MedicationReminder["frequency"],
  times: "",
  instructions: "",
  displayAlias: "",
};

export default function RemindersPage() {
  return (
    <GuestGate feature="Med Reminders">
      <RemindersPageContent />
    </GuestGate>
  );
}

function RemindersPageContent() {
  const [reminders, setReminders] = useState<MedicationReminder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    apiGet<{ success: boolean; data?: MedicationReminder[]; message?: string }>("/api/medication-reminders").then(
      ({ data }) => {
        if (data.success && data.data) {
          setReminders(data.data);
        } else {
          setError(data.message ?? "Could not load your reminders.");
        }
      }
    );
  }

  useEffect(load, []);

  function openAddForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(reminder: MedicationReminder) {
    setEditingId(reminder._id);
    setForm({
      drugName: reminder.drugName,
      dosage: reminder.dosage ?? "",
      frequency: reminder.frequency,
      times: reminder.times.join(", "),
      instructions: reminder.instructions ?? "",
      displayAlias: reminder.displayAlias ?? "",
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSave() {
    const times = form.times
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!form.drugName.trim()) {
      setFormError("Medication name is required.");
      return;
    }
    if (times.length === 0) {
      setFormError("Add at least one time (e.g. 08:00, 20:00).");
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      drugName: form.drugName.trim(),
      dosage: form.dosage.trim() || undefined,
      frequency: form.frequency,
      times,
      instructions: form.instructions.trim() || undefined,
      displayAlias: form.displayAlias.trim() || undefined,
    };

    const { data } = editingId
      ? await apiPut<{ success: boolean; message?: string }>(`/api/medication-reminders/${editingId}`, payload)
      : await apiPost<{ success: boolean; message?: string }>("/api/medication-reminders", payload);

    setSaving(false);
    if (data.success) {
      setShowForm(false);
      load();
    } else {
      setFormError(data.message ?? "Could not save this reminder.");
    }
  }

  async function handleToggle(id: string) {
    const { data } = await apiPatch<{ success: boolean; message?: string }>(`/api/medication-reminders/${id}/toggle`);
    if (data.success) {
      load();
    } else {
      setError(data.message ?? "Could not update this reminder.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this reminder?")) return;
    const { data } = await apiDelete<{ success: boolean; message?: string }>(`/api/medication-reminders/${id}`);
    if (data.success) {
      load();
    } else {
      setError(data.message ?? "Could not delete this reminder.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">Med Reminders</h1>
          <p className="mt-1 text-sm text-muted">
            Private reminders for your medications — give one a discreet display name if you&apos;d like.
          </p>
        </div>
        <Button onClick={openAddForm}>Add reminder</Button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!reminders && !error && <p className="mt-6 text-sm text-muted">Loading...</p>}
      {reminders && reminders.length === 0 && (
        <div className="mt-6 rounded-card bg-card-bg p-6 text-center shadow-atmospheric">
          <p className="text-sm text-muted">No reminders yet.</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {reminders?.map((reminder) => (
          <div key={reminder._id} className="rounded-card bg-card-bg p-4 shadow-atmospheric">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-heading">{reminder.displayAlias || reminder.drugName}</p>
                {reminder.displayAlias && (
                  <p className="text-xs text-muted">Actual: {reminder.drugName}</p>
                )}
                {reminder.dosage && <p className="text-sm text-muted">{reminder.dosage}</p>}
              </div>
              <div className="flex shrink-0 gap-2 text-xs font-semibold">
                <button className="text-primary" onClick={() => openEditForm(reminder)}>
                  Edit
                </button>
                <button className="text-red-600" onClick={() => handleDelete(reminder._id)}>
                  Delete
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span>{FREQUENCIES.find((f) => f.value === reminder.frequency)?.label}</span>
              <span>{reminder.times.join(", ")}</span>
            </div>
            {reminder.instructions && <p className="mt-2 text-sm text-body">{reminder.instructions}</p>}
            <button
              onClick={() => handleToggle(reminder._id)}
              className={`mt-3 rounded-full px-3 py-1 text-xs font-semibold ${
                reminder.isActive ? "bg-accent-blue-bg text-accent-blue-fg" : "bg-accent-gray-bg text-accent-gray-fg"
              }`}
            >
              {reminder.isActive ? "Active" : "Paused"}
            </button>
          </div>
        ))}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? "Edit reminder" : "Add reminder"}
        maxWidthClassName="max-w-lg"
      >
        <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Medication name"
                value={form.drugName}
                onChange={(e) => setForm((f) => ({ ...f, drugName: e.target.value }))}
              />
              <Input
                label="Dosage"
                value={form.dosage}
                onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))}
                placeholder="e.g. 200mg"
              />
              <Select
                label="Frequency"
                value={form.frequency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, frequency: e.target.value as MedicationReminder["frequency"] }))
                }
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
              <Input
                label="Times"
                value={form.times}
                onChange={(e) => setForm((f) => ({ ...f, times: e.target.value }))}
                placeholder="08:00, 20:00"
              />
              <Input
                label="Display name (optional)"
                value={form.displayAlias}
                onChange={(e) => setForm((f) => ({ ...f, displayAlias: e.target.value }))}
                placeholder="e.g. Daily Vitamin Reminder"
                className="sm:col-span-2"
              />
            </div>
            <div className="mt-4">
              <Textarea
                label="Instructions (optional)"
                value={form.instructions}
                onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                rows={2}
              />
            </div>

            {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button loading={saving} onClick={handleSave}>
                Save
              </Button>
            </div>
        </>
      </Modal>
    </div>
  );
}
