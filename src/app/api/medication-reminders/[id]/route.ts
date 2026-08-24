import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

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
  "isActive",
] as const;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const { id } = await params;
  const body = await req.json();
  const payload: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) payload[field] = body[field];
  }

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/medication-reminders/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const { id } = await params;

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/medication-reminders/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
