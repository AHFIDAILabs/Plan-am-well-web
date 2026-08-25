import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/appointments/${encodeURIComponent(id)}/payment/status`);
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
