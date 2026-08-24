import { NextRequest, NextResponse } from "next/server";
import { forwardedForHeader } from "@/lib/clientIp";

const API_BASE = process.env.BACKEND_API_URL;

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json({ success: false, message: "token and password are required" }, { status: 400 });
  }

  const backendRes = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...forwardedForHeader(req) },
    body: JSON.stringify({ token, password }),
    cache: "no-store",
  });

  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
