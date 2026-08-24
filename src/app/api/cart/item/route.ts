import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

// The backend's real contract for removing one cart item is odd: the route
// is DELETE /cart/:itemId, but removeCartItem actually reads `drugId` from
// the request BODY, ignoring the path param entirely. We still put drugId
// in the path too (harmless, keeps backend logs sensible) but the body is
// what the controller actually uses.
export async function DELETE(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const body = await req.json();
  const drugId = body.drugId;

  if (!drugId) {
    return NextResponse.json({ success: false, message: "drugId is required" }, { status: 400 });
  }

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, `/cart/${encodeURIComponent(drugId)}`, {
      method: "DELETE",
      body: JSON.stringify({ drugId }),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
