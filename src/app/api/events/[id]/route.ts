import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";

// Reaching this page at all already requires a session (proxy.ts redirects
// signed-out visitors before they get here — even browsing as "guest" means
// a real, if anonymous, session exists), so backendFetch never throws for
// lack of one here. Switched from publicBackendFetch specifically so the
// backend can resolve req.auth and return the viewer's own RSVP status
// (myRsvp) — that never worked with no Authorization header forwarded.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/events/${encodeURIComponent(id)}`);
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
