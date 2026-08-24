import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const { id } = await params;
  const body = await req.json();
  const payload: Record<string, unknown> = {};
  if (body.chosenName !== undefined) payload.chosenName = body.chosenName;
  if (body.reminderOptIn !== undefined) payload.reminderOptIn = body.reminderOptIn;

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/events/${encodeURIComponent(id)}/rsvp`, {
      method: "POST",
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
    const backendRes = await backendFetch(req, `/events/${encodeURIComponent(id)}/rsvp`, {
      method: "DELETE",
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
