import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";

// Actively asks the backend to re-check delivery status with the partner —
// the order record only otherwise updates via an external webhook, which (as
// with payment status) can be delayed or never arrive, leaving this page
// showing a stale deliveryStatus with no way to notice. Mirrors the mobile
// app's useOrderDetails hook's refreshDelivery() call to the same endpoint.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/orders/${encodeURIComponent(id)}/delivery-status`);
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
