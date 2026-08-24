import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";

export async function GET(req: NextRequest) {
  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, "/medical-records/access-requests");
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
