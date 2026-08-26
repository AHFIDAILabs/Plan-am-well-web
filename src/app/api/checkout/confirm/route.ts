import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";
import { getPublicOrigin } from "@/lib/publicUrl";

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const body = await req.json();
  const orderId = body.orderId;

  if (!orderId) {
    return NextResponse.json({ success: false, message: "orderId is required" }, { status: 400 });
  }

  // Backend appends "?orderId=" itself (see checkoutController.resolveRedirectUrl) —
  // this just needs to point at the order page the payment provider should land on.
  // req.nextUrl.origin resolved to Render's internal bind address (localhost)
  // in production, sending Paystack's payment callback to a dead localhost
  // URL instead of the real public domain — getPublicOrigin reads the
  // forwarded host/proto Render's proxy actually sent the request to instead.
  const redirectUrl = `${getPublicOrigin(req)}/app/orders/${encodeURIComponent(orderId)}`;

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, "/checkout/confirm", {
      method: "POST",
      body: JSON.stringify({ orderId, redirectUrl }),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
