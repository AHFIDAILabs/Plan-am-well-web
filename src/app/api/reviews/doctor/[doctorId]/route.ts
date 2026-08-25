import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ doctorId: string }> }) {
  const { doctorId } = await params;
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") ?? "1";
  const limit = searchParams.get("limit") ?? "10";

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(
      req,
      `/reviews/doctor/${encodeURIComponent(doctorId)}?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`
    );
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
