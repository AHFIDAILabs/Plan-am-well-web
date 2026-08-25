import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const body = await req.json();
  const { doctorId, rating, comment, appointmentId } = body;

  if (!doctorId || !rating) {
    return NextResponse.json({ success: false, message: "doctorId and rating are required" }, { status: 400 });
  }

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, "/reviews", {
      method: "POST",
      body: JSON.stringify({ doctorId, rating, comment, appointmentId }),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
