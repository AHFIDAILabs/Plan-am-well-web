import { NextRequest, NextResponse } from "next/server";
import { forwardedForHeader } from "@/lib/clientIp";

const API_BASE = process.env.BACKEND_API_URL;

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ success: false, message: "email is required" }, { status: 400 });
  }

  const backendRes = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...forwardedForHeader(req) },
    body: JSON.stringify({ email }),
    cache: "no-store",
  });

  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
