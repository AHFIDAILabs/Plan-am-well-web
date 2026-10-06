import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

// Actively asks the backend to re-check a payment's real status (which, for
// the real/partner path, means the backend calls the partner's own verify
// endpoint directly) rather than passively waiting for Order.paymentStatus
// to be updated by an external webhook that may never arrive.
export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const body = await req.json();
  const paymentReference = body.paymentReference;

  if (!paymentReference) {
    return NextResponse.json({ success: false, message: "paymentReference is required" }, { status: 400 });
  }

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, "/payment/verify", {
      method: "POST",
      body: JSON.stringify({ paymentReference }),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
