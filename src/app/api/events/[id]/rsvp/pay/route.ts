import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";
import { getPublicOrigin } from "@/lib/publicUrl";

// Same getPublicOrigin pattern as /api/payment/initiate — resolves to the
// real public domain rather than Render's internal hostname, and to the
// event detail page so a completed real-provider payment lands back on it.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const { id } = await params;
  const redirectUrl = `${getPublicOrigin(req)}/app/community/${encodeURIComponent(id)}`;

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/events/${encodeURIComponent(id)}/rsvp/pay`, {
      method: "POST",
      body: JSON.stringify({ redirectUrl }),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
