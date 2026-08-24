import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function GET(req: NextRequest) {
  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, "/medication-reminders");
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}

const ALLOWED_FIELDS = [
  "drugName",
  "dosage",
  "frequency",
  "times",
  "instructions",
  "color",
  "startDate",
  "endDate",
  "displayAlias",
] as const;

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const body = await req.json();
  const payload: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) payload[field] = body[field];
  }

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, "/medication-reminders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
