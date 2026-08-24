"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { AccessRequest, MedicalRecord, doctorFullName, doctorImageUrl } from "@/lib/types";
import { GuestGate } from "@/components/auth/GuestGate";
import { BiometricGate } from "@/components/records/BiometricGate";

export default function RecordsPage() {
  return (
    <GuestGate feature="Medical Records">
      <BiometricGate>
        <RecordsPageContent />
      </BiometricGate>
    </GuestGate>
  );
}

function RecordsPageContent() {
  const [record, setRecord] = useState<MedicalRecord | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const [pending, setPending] = useState<AccessRequest[]>([]);
  const [history, setHistory] = useState<AccessRequest[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  function load() {
    apiGet<{ success: boolean; data: MedicalRecord | null; message?: string }>("/api/records/my").then(({ data }) => {
      if (data.success) {
        setRecord(data.data);
      } else {
        setError(data.message ?? "Could not load your medical record.");
      }
    });
    apiGet<{ success: boolean; data?: AccessRequest[] }>("/api/records/access-requests/pending").then(({ data }) => {
      if (data.success && data.data) setPending(data.data);
    });
    apiGet<{ success: boolean; data?: AccessRequest[] }>("/api/records/access-requests").then(({ data }) => {
      if (data.success && data.data) setHistory(data.data);
    });
  }

  useEffect(load, []);

  async function respond(requestId: string, approve: boolean) {
    setRespondingId(requestId);
    await apiPatch(`/api/records/access-request/${requestId}/respond`, { approve });
    setRespondingId(null);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">Medical Records</h1>
          <p className="mt-1 text-sm text-muted">Your consultation history and who has access to it.</p>
        </div>
        {record && (
          <a href={`/api/records/pdf/${record.patientId}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline">Download PDF</Button>
          </a>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {pending.length > 0 && (
        <div className="mt-6">
          <h2 className="font-bold text-heading">Pending access requests</h2>
          <div className="mt-3 flex flex-col gap-3">
            {pending.map((req) => (
              <div key={req._id} className="rounded-xl border border-secondary bg-accent-amber-bg p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white">
                      {doctorImageUrl(req.requestingDoctorId) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={doctorImageUrl(req.requestingDoctorId)!}
                          alt={doctorFullName(req.requestingDoctorId)}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-heading">{doctorFullName(req.requestingDoctorId)}</p>
                      <p className="text-xs text-muted">wants access to your medical record</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button loading={respondingId === req._id} onClick={() => respond(req._id, true)}>
                      Approve
                    </Button>
                    <Button variant="outline" loading={respondingId === req._id} onClick={() => respond(req._id, false)}>
                      Deny
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {record === undefined && !error && <p className="mt-6 text-sm text-muted">Loading...</p>}

      {record === null && (
        <div className="mt-6 rounded-card bg-card-bg shadow-atmospheric p-6 text-center">
          <p className="text-sm text-muted">No medical record yet — one is created after your first consultation.</p>
        </div>
      )}

      {record && (
        <div className="mt-6 rounded-card bg-card-bg shadow-atmospheric p-6">
          <h2 className="font-bold text-heading">Patient information</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted">Gender</p>
              <p className="text-heading">{record.patientSnapshot.gender ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Blood group</p>
              <p className="text-heading">{record.patientSnapshot.bloodGroup ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Allergies</p>
              <p className="text-heading">{record.patientSnapshot.allergies?.join(", ") || "None recorded"}</p>
            </div>
          </div>
        </div>
      )}

      {record && record.consultationNotes.length > 0 && (
        <div className="mt-6 flex flex-col gap-4">
          {[...record.consultationNotes]
            .sort((a, b) => new Date(b.consultationDate).getTime() - new Date(a.consultationDate).getTime())
            .map((note) => (
              <div key={note._id} className="rounded-card bg-card-bg shadow-atmospheric p-5">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-primary">{new Date(note.consultationDate).toLocaleDateString()}</p>
                  <p className="text-sm text-muted">
                    {note.doctorName} · {note.doctorSpecialization}
                  </p>
                </div>

                <p className="mt-3 text-sm font-semibold text-heading">Chief complaint</p>
                <p className="text-sm text-body">{note.chiefComplaint}</p>

                {note.vitalSigns && Object.values(note.vitalSigns).some(Boolean) && (
                  <>
                    <p className="mt-3 text-sm font-semibold text-heading">Vital signs</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-body">
                      {note.vitalSigns.bloodPressure && <span>BP: {note.vitalSigns.bloodPressure}</span>}
                      {note.vitalSigns.pulse && <span>Pulse: {note.vitalSigns.pulse}</span>}
                      {note.vitalSigns.temperature && <span>Temp: {note.vitalSigns.temperature}</span>}
                      {note.vitalSigns.weight && <span>Weight: {note.vitalSigns.weight}</span>}
                      {note.vitalSigns.height && <span>Height: {note.vitalSigns.height}</span>}
                      {note.vitalSigns.bmi && <span>BMI: {note.vitalSigns.bmi}</span>}
                      {note.vitalSigns.oxygenSaturation && <span>O2: {note.vitalSigns.oxygenSaturation}</span>}
                    </div>
                  </>
                )}

                {note.diagnosis.length > 0 && (
                  <>
                    <p className="mt-3 text-sm font-semibold text-heading">Diagnosis</p>
                    <ul className="list-inside list-disc text-sm text-body">
                      {note.diagnosis.map((d, i) => (
                        <li key={i}>
                          {d.description}
                          {d.code ? ` (${d.code})` : ""}
                          {d.severity ? ` — ${d.severity}` : ""}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {note.prescriptions.length > 0 && (
                  <>
                    <p className="mt-3 text-sm font-semibold text-heading">Prescriptions</p>
                    <ul className="list-inside list-disc text-sm text-body">
                      {note.prescriptions.map((rx, i) => (
                        <li key={i}>
                          {rx.drug} {rx.dosage} ({rx.form}) — {rx.frequency} for {rx.duration}
                          {rx.instructions ? `. ${rx.instructions}` : ""}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {note.labTests.length > 0 && (
                  <>
                    <p className="mt-3 text-sm font-semibold text-heading">Lab tests</p>
                    <ul className="list-inside list-disc text-sm text-body">
                      {note.labTests.map((t, i) => (
                        <li key={i}>
                          {t.name}
                          {t.result ? `: ${t.result} ${t.unit ?? ""}` : " (pending)"}
                          {t.status ? ` — ${t.status}` : ""}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {note.followUpInstructions && (
                  <>
                    <p className="mt-3 text-sm font-semibold text-heading">Follow-up</p>
                    <p className="text-sm text-body">{note.followUpInstructions}</p>
                    {note.followUpDate && (
                      <p className="text-xs text-muted">
                        Follow-up date: {new Date(note.followUpDate).toLocaleDateString()}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="font-bold text-heading">Access history</h2>
          <div className="mt-3 flex flex-col gap-2">
            {history.map((req) => (
              <div
                key={req._id}
                className="flex items-center justify-between rounded-2xl bg-card-bg shadow-atmospheric p-3 text-sm"
              >
                <span className="text-heading">{doctorFullName(req.requestingDoctorId)}</span>
                <span className="capitalize text-muted">{req.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
