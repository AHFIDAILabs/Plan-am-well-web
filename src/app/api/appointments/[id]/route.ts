import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/appointments/appointment/${encodeURIComponent(id)}`);
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}

const PATCHABLE_FIELDS = ["status", "scheduledAt", "notes", "consultationType", "shareUserInfo"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const { id } = await params;
  const body = await req.json();

  const payload: Record<string, unknown> = {};
  for (const field of PATCHABLE_FIELDS) {
    if (body[field] !== undefined) payload[field] = body[field];
  }

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/appointments/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
