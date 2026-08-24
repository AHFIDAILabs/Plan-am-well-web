"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { ConsultationNote, DiagnosisEntry, LabTest, MedicalRecord, Prescription, VitalSigns } from "@/lib/types";

interface CheckAccessResult {
  hasAccess: boolean;
  hasPending: boolean;
}

const EMPTY_VITALS: VitalSigns = {};

export default function DoctorPatientRecordPage() {
  const params = useParams<{ patientId: string }>();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const patientId = params.patientId;

  const [access, setAccess] = useState<CheckAccessResult | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);

  const [chiefComplaint, setChiefComplaint] = useState("");
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>(EMPTY_VITALS);
  const [diagnosis, setDiagnosis] = useState<DiagnosisEntry[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [followUpInstructions, setFollowUpInstructions] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function loadAccessAndRecord() {
    apiGet<{ success: boolean; data?: CheckAccessResult }>(`/api/records/check-access/${patientId}`).then(
      ({ data }) => {
        if (data.success && data.data) {
          setAccess(data.data);
          if (data.data.hasAccess) loadRecord();
        }
      }
    );
  }

  function loadRecord() {
    apiGet<{ success: boolean; data?: MedicalRecord; message?: string }>(
      `/api/records/patient/${patientId}${appointmentId ? `?appointmentId=${appointmentId}` : ""}`
    ).then(({ data }) => {
      if (data.success && data.data) {
        setRecord(data.data);
        if (appointmentId) {
          const existing = data.data.consultationNotes.find((n) => n.appointmentId === appointmentId);
          if (existing) prefillForm(existing);
        }
      } else {
        setRecordError(data.message ?? "Could not load this patient's record.");
      }
    });
  }

  function prefillForm(note: ConsultationNote) {
    setChiefComplaint(note.chiefComplaint);
    setVitalSigns(note.vitalSigns ?? {});
    setDiagnosis(note.diagnosis);
    setPrescriptions(note.prescriptions);
    setLabTests(note.labTests);
    setFollowUpInstructions(note.followUpInstructions ?? "");
    setPrivateNotes(note.privateNotes ?? "");
  }

  useEffect(loadAccessAndRecord, [patientId]);

  async function handleRequestAccess() {
    if (!appointmentId) return;
    setRequesting(true);
    setAccessError(null);
    const { data } = await apiPost<{ success: boolean; message?: string }>("/api/records/request-access", {
      patientId,
      appointmentId,
    });
    setRequesting(false);
    if (data.success) {
      loadAccessAndRecord();
    } else {
      setAccessError(data.message ?? "Could not send the access request.");
    }
  }

  async function handleSaveNote() {
    if (!appointmentId || !chiefComplaint.trim()) {
      setSaveError("Chief complaint is required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const { data } = await apiPost<{ success: boolean; message?: string }>("/api/records/note", {
      appointmentId,
      chiefComplaint: chiefComplaint.trim(),
      vitalSigns,
      diagnosis,
      prescriptions,
      labTests,
      followUpInstructions: followUpInstructions.trim() || undefined,
      privateNotes: privateNotes.trim() || undefined,
    });
    setSaving(false);
    if (data.success) {
      setSaved(true);
      loadRecord();
    } else {
      setSaveError(data.message ?? "Could not save this note.");
    }
  }

  if (!access) {
    return <p className="text-sm text-muted">Loading...</p>;
  }

  if (!access.hasAccess) {
    return (
      <div>
        <Link href="/provider/appointments" className="text-sm font-semibold text-primary">
          &larr; Back to appointments
        </Link>
        <div className="mx-auto mt-6 max-w-md rounded-card bg-card-bg shadow-atmospheric p-6 text-center">
          <h1 className="font-bold text-heading">Medical record access</h1>
          {access.hasPending ? (
            <p className="mt-2 text-sm text-muted">
              Your access request is pending patient approval. You&apos;ll be notified once they respond.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">
                You need the patient&apos;s approval before viewing their medical record.
              </p>
              {accessError && <p className="mt-2 text-sm text-red-600">{accessError}</p>}
              <Button className="mt-4" loading={requesting} disabled={!appointmentId} onClick={handleRequestAccess}>
                Request access
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link href="/provider/appointments" className="text-sm font-semibold text-primary">
        &larr; Back to appointments
      </Link>

      {recordError && <p className="mt-4 text-sm text-red-600">{recordError}</p>}

      {record && (
        <div className="mt-4 rounded-card bg-card-bg shadow-atmospheric p-6">
          <h1 className="font-bold text-heading">{record.patientSnapshot.name}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span>{record.patientSnapshot.gender ?? "—"}</span>
            <span>Blood group: {record.patientSnapshot.bloodGroup ?? "—"}</span>
            <span>Allergies: {record.patientSnapshot.allergies?.join(", ") || "None recorded"}</span>
          </div>
        </div>
      )}

      {record && record.consultationNotes.length > 0 && (
        <div className="mt-6">
          <h2 className="font-bold text-heading">Previous consultations</h2>
          <div className="mt-3 flex flex-col gap-3">
            {record.consultationNotes
              .filter((n) => n.appointmentId !== appointmentId)
              .sort((a, b) => new Date(b.consultationDate).getTime() - new Date(a.consultationDate).getTime())
              .map((note) => (
                <div key={note._id} className="rounded-card bg-card-bg shadow-atmospheric p-4">
                  <p className="text-sm font-semibold text-heading">
                    {new Date(note.consultationDate).toLocaleDateString()} — {note.doctorName}
                  </p>
                  <p className="mt-1 text-sm text-body">{note.chiefComplaint}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {appointmentId && (
        <div className="mt-6 rounded-card bg-card-bg shadow-atmospheric p-6">
          <h2 className="font-bold text-heading">Consultation note for this appointment</h2>

          <div className="mt-4">
            <Textarea
              label="Chief complaint"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              rows={2}
            />
          </div>

          <p className="mb-2 mt-4 text-xs font-semibold text-heading">Vital signs</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Input
              placeholder="BP e.g. 120/80"
              value={vitalSigns.bloodPressure ?? ""}
              onChange={(e) => setVitalSigns((v) => ({ ...v, bloodPressure: e.target.value }))}
            />
            <Input
              placeholder="Pulse"
              value={vitalSigns.pulse ?? ""}
              onChange={(e) => setVitalSigns((v) => ({ ...v, pulse: e.target.value }))}
            />
            <Input
              placeholder="Temp"
              value={vitalSigns.temperature ?? ""}
              onChange={(e) => setVitalSigns((v) => ({ ...v, temperature: e.target.value }))}
            />
            <Input
              placeholder="Weight"
              value={vitalSigns.weight ?? ""}
              onChange={(e) => setVitalSigns((v) => ({ ...v, weight: e.target.value }))}
            />
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-heading">Diagnosis</p>
              <button
                className="text-xs font-semibold text-primary"
                onClick={() => setDiagnosis((d) => [...d, { description: "" }])}
              >
                + Add
              </button>
            </div>
            {diagnosis.map((d, i) => (
              <div key={i} className="mt-2 flex gap-2">
                <Input
                  placeholder="Description"
                  value={d.description}
                  onChange={(e) =>
                    setDiagnosis((prev) => prev.map((x, idx) => (idx === i ? { ...x, description: e.target.value } : x)))
                  }
                />
                <button
                  className="shrink-0 text-xs font-semibold text-red-600"
                  onClick={() => setDiagnosis((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-heading">Prescriptions</p>
              <button
                className="text-xs font-semibold text-primary"
                onClick={() =>
                  setPrescriptions((p) => [...p, { drug: "", dosage: "", form: "", frequency: "", duration: "" }])
                }
              >
                + Add
              </button>
            </div>
            {prescriptions.map((rx, i) => (
              <div key={i} className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-border p-3 sm:grid-cols-5">
                <Input
                  placeholder="Drug"
                  value={rx.drug}
                  onChange={(e) => setPrescriptions((p) => p.map((x, idx) => (idx === i ? { ...x, drug: e.target.value } : x)))}
                />
                <Input
                  placeholder="Dosage"
                  value={rx.dosage}
                  onChange={(e) => setPrescriptions((p) => p.map((x, idx) => (idx === i ? { ...x, dosage: e.target.value } : x)))}
                />
                <Input
                  placeholder="Form"
                  value={rx.form}
                  onChange={(e) => setPrescriptions((p) => p.map((x, idx) => (idx === i ? { ...x, form: e.target.value } : x)))}
                />
                <Input
                  placeholder="Frequency"
                  value={rx.frequency}
                  onChange={(e) =>
                    setPrescriptions((p) => p.map((x, idx) => (idx === i ? { ...x, frequency: e.target.value } : x)))
                  }
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Duration"
                    value={rx.duration}
                    onChange={(e) =>
                      setPrescriptions((p) => p.map((x, idx) => (idx === i ? { ...x, duration: e.target.value } : x)))
                    }
                  />
                  <button
                    className="shrink-0 text-xs font-semibold text-red-600"
                    onClick={() => setPrescriptions((p) => p.filter((_, idx) => idx !== i))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-heading">Lab tests</p>
              <button
                className="text-xs font-semibold text-primary"
                onClick={() => setLabTests((t) => [...t, { name: "" }])}
              >
                + Add
              </button>
            </div>
            {labTests.map((t, i) => (
              <div key={i} className="mt-2 flex gap-2">
                <Input
                  placeholder="Test name"
                  value={t.name}
                  onChange={(e) => setLabTests((p) => p.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
                />
                <Input
                  placeholder="Result"
                  value={t.result ?? ""}
                  onChange={(e) => setLabTests((p) => p.map((x, idx) => (idx === i ? { ...x, result: e.target.value } : x)))}
                />
                <button
                  className="shrink-0 text-xs font-semibold text-red-600"
                  onClick={() => setLabTests((p) => p.filter((_, idx) => idx !== i))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Textarea
              label="Follow-up instructions"
              value={followUpInstructions}
              onChange={(e) => setFollowUpInstructions(e.target.value)}
              rows={2}
            />
          </div>

          <div className="mt-4">
            <Textarea
              label="Private notes (never shared with patient or other doctors)"
              value={privateNotes}
              onChange={(e) => setPrivateNotes(e.target.value)}
              rows={2}
            />
          </div>

          {saveError && <p className="mt-3 text-sm text-red-600">{saveError}</p>}
          {saved && <p className="mt-3 text-sm text-green-700">Note saved.</p>}

          <Button className="mt-5" loading={saving} onClick={handleSaveNote}>
            Save note
          </Button>
        </div>
      )}
    </div>
  );
}
