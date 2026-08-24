import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

const ALLOWED_FIELDS = [
  "appointmentId",
  "chiefComplaint",
  "vitalSigns",
  "diagnosis",
  "prescriptions",
  "labTests",
  "followUpInstructions",
  "followUpDate",
  "privateNotes",
  "attachments",
  "bloodGroup",
  "allergies",
] as const;

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const body = await req.json();

  if (!body.appointmentId || !body.chiefComplaint) {
    return NextResponse.json(
      { success: false, message: "appointmentId and chiefComplaint are required" },
      { status: 400 }
    );
  }

  const payload: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) payload[field] = body[field];
  }

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, "/medical-records/note", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
