import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const incoming = await req.formData();
  const file = incoming.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ success: false, message: "file is required" }, { status: 400 });
  }

  const outgoing = new FormData();
  outgoing.append("file", file);

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, "/chatbot/transcribe", {
      method: "POST",
      body: outgoing,
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
