import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const { searchParams } = new URL(req.url);
  const appointmentId = searchParams.get("appointmentId");

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(
      req,
      `/medical-records/patient/${encodeURIComponent(patientId)}${appointmentId ? `?appointmentId=${encodeURIComponent(appointmentId)}` : ""}`
    );
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
