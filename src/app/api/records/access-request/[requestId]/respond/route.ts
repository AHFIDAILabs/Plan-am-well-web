import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const { requestId } = await params;
  const body = await req.json();
  const approve = Boolean(body.approve);

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/medical-records/access-request/${encodeURIComponent(requestId)}/respond`, {
      method: "PATCH",
      body: JSON.stringify({ approve }),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
