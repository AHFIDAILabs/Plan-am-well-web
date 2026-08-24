import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get("doctorId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!doctorId || !from || !to) {
    return NextResponse.json({ success: false, message: "doctorId, from and to are required" }, { status: 400 });
  }

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(
      req,
      `/appointments/booked-slots?doctorId=${encodeURIComponent(doctorId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
