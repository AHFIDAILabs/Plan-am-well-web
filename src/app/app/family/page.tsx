"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FamilyMember } from "@/lib/types";
import { GuestGate } from "@/components/auth/GuestGate";

const RELATIONSHIPS: FamilyMember["relationship"][] = ["Spouse", "Child", "Parent", "Sibling", "Other"];

const EMPTY_FORM = {
  name: "",
  relationship: "Spouse" as FamilyMember["relationship"],
  gender: "" as "" | "Male" | "Female" | "Other",
  dateOfBirth: "",
  bloodGroup: "",
  allergies: "",
  notes: "",
};

export default function FamilyPage() {
  return (
    <GuestGate feature="Family Profiles">
      <FamilyPageContent />
    </GuestGate>
  );
}

function FamilyPageContent() {
  const [members, setMembers] = useState<FamilyMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    apiGet<{ success: boolean; data?: FamilyMember[]; message?: string }>("/api/family").then(({ data }) => {
      if (data.success && data.data) {
        setMembers(data.data);
      } else {
        setError(data.message ?? "Could not load family members.");
      }
    });
  }

  useEffect(load, []);

  function openAddForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(member: FamilyMember) {
    setEditingId(member._id);
    setForm({
      name: member.name,
      relationship: member.relationship,
      gender: member.gender ?? "",
      dateOfBirth: member.dateOfBirth ? member.dateOfBirth.slice(0, 10) : "",
      bloodGroup: member.bloodGroup ?? "",
      allergies: member.allergies ?? "",
      notes: member.notes ?? "",
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    setSaving(true);
    setFormError(null);

    const payload = {
      name: form.name.trim(),
      relationship: form.relationship,
      gender: form.gender || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      bloodGroup: form.bloodGroup.trim() || undefined,
      allergies: form.allergies.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    const { data } = editingId
      ? await apiPut<{ success: boolean; message?: string }>(`/api/family/${editingId}`, payload)
      : await apiPost<{ success: boolean; message?: string }>("/api/family", payload);

    setSaving(false);
    if (data.success) {
      setShowForm(false);
      load();
    } else {
      setFormError(data.message ?? "Could not save this family member.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this family member?")) return;
    const { data } = await apiDelete<{ success: boolean; message?: string }>(`/api/family/${id}`);
    if (data.success) {
      load();
    } else {
      setError(data.message ?? "Could not remove this family member.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">Family Profiles</h1>
          <p className="mt-1 text-sm text-muted">
            Add family members so you can book appointments on their behalf.
          </p>
        </div>
        <Button onClick={openAddForm}>Add family member</Button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!members && !error && <p className="mt-6 text-sm text-muted">Loading...</p>}
      {members && members.length === 0 && (
        <div className="mt-6 rounded-card bg-card-bg shadow-atmospheric p-6 text-center">
          <p className="text-sm text-muted">No family members added yet.</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {members?.map((member) => (
          <div key={member._id} className="rounded-card bg-card-bg shadow-atmospheric p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-heading">{member.name}</p>
                <p className="text-sm text-muted">{member.relationship}</p>
              </div>
              <div className="flex shrink-0 gap-2 text-xs font-semibold">
                <button className="text-primary" onClick={() => openEditForm(member)}>
                  Edit
                </button>
                <button className="text-red-600" onClick={() => handleDelete(member._id)}>
                  Remove
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {member.gender && <span>{member.gender}</span>}
              {member.dateOfBirth && <span>DOB: {new Date(member.dateOfBirth).toLocaleDateString()}</span>}
              {member.bloodGroup && <span>Blood: {member.bloodGroup}</span>}
            </div>
            {member.allergies && <p className="mt-2 text-sm text-body">Allergies: {member.allergies}</p>}
            {member.notes && <p className="mt-1 text-sm text-body">{member.notes}</p>}
          </div>
        ))}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? "Edit family member" : "Add family member"}
        maxWidthClassName="max-w-lg"
      >
        <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Full name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Select
                label="Relationship"
                value={form.relationship}
                onChange={(e) =>
                  setForm((f) => ({ ...f, relationship: e.target.value as FamilyMember["relationship"] }))
                }
              >
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
              <Select
                label="Gender"
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as typeof f.gender }))}
              >
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
              <Input
                label="Date of birth"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
              />
              <Input
                label="Blood group"
                value={form.bloodGroup}
                onChange={(e) => setForm((f) => ({ ...f, bloodGroup: e.target.value }))}
              />
              <Input
                label="Allergies"
                value={form.allergies}
                onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))}
              />
            </div>
            <div className="mt-4">
              <Textarea
                label="Notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
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
