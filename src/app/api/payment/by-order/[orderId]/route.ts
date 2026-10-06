import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";

// Looks up the (latest) Payment record for an order — used by the order
// detail page to find a paymentReference to actively verify, the same way
// the mobile app's useOrderDetails hook already does. Needed because the
// real (partner) payment path only updates Order.paymentStatus via an
// external webhook — if that webhook never fires, the order sits "pending"
// forever with nothing to notice it, no matter how often the page is
// refreshed, unless something actively asks the partner for the real status.
export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/payment/by-order/${encodeURIComponent(orderId)}`);
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
