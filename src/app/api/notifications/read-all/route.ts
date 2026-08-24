import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function PUT(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, "/notifications/read-all", { method: "PUT" });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
