import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function GET(req: NextRequest) {
  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, "/cart");
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const body = await req.json();
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ success: false, message: "items array is required" }, { status: 400 });
  }

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, "/cart", {
      method: "POST",
      body: JSON.stringify({ items: body.items }),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}

export async function DELETE(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, "/cart", { method: "DELETE" });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}

export async function PUT(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const body = await req.json();
  const { drugId, quantity, dosage, specialInstructions } = body;

  if (!drugId || typeof quantity !== "number") {
    return NextResponse.json({ success: false, message: "drugId and quantity are required" }, { status: 400 });
  }

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, "/cart/update", {
      method: "PUT",
      body: JSON.stringify({ drugId, quantity, dosage, specialInstructions }),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
