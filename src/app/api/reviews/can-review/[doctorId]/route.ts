import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ doctorId: string }> }) {
  const { doctorId } = await params;

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/reviews/can-review/${encodeURIComponent(doctorId)}`);
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
