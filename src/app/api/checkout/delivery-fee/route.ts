import { NextRequest, NextResponse } from "next/server";
import { publicBackendFetch } from "@/lib/backendFetch";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const state = searchParams.get("state");
  const lga = searchParams.get("lga");

  if (!state || !lga) {
    return NextResponse.json({ success: false, message: "state and lga are required" }, { status: 400 });
  }

  const backendRes = await publicBackendFetch(
    req,
    `/checkout/delivery-fee?state=${encodeURIComponent(state)}&lga=${encodeURIComponent(lga)}`
  );
  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
