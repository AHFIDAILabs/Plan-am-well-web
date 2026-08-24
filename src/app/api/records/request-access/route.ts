import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const body = await req.json();
  const { patientId, appointmentId } = body;

  if (!patientId || !appointmentId) {
    return NextResponse.json({ success: false, message: "patientId and appointmentId are required" }, { status: 400 });
  }

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, "/medical-records/request-access", {
      method: "POST",
      body: JSON.stringify({ patientId, appointmentId }),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
