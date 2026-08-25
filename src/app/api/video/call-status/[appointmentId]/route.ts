import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/video/call-status/${encodeURIComponent(appointmentId)}`);
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
