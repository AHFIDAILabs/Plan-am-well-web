import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";
import { getPublicOrigin } from "@/lib/publicUrl";

// Resumes payment on an order that's already been confirmed (partner order
// created) but is still unpaid — e.g. a patient came back later via the
// "Complete Your Payment" reminder notification. Distinct from
// /api/checkout/confirm, which creates the partner order in the first
// place; this hits backend paymentController's initiatePayment instead,
// which only starts a new payment session against an existing order.
export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const body = await req.json();
  const orderId = body.orderId;

  if (!orderId) {
    return NextResponse.json({ success: false, message: "orderId is required" }, { status: 400 });
  }

  // Same getPublicOrigin reasoning as checkout/confirm's route — backend
  // appends "?orderId=" itself (see checkoutController.resolveRedirectUrl).
  const redirectUrl = `${getPublicOrigin(req)}/app/orders/${encodeURIComponent(orderId)}`;

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, "/payment/initiate", {
      method: "POST",
      body: JSON.stringify({ orderId, redirectUrl }),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
