import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/medical-records/check-access/${encodeURIComponent(patientId)}`);
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
