import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendAuthError } from "@/lib/backendFetch";

export async function GET(req: NextRequest, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;

  let backendRes: Response;
  try {
    backendRes = await backendFetch(req, `/medical-records/pdf/${encodeURIComponent(patientId)}`);
  } catch (err) {
    if (err instanceof BackendAuthError) {
      return NextResponse.json({ success: false, message: err.message }, { status: 401 });
    }
    throw err;
  }

  if (!backendRes.ok) {
    const data = await backendRes.json().catch(() => ({ success: false, message: "Could not generate PDF" }));
    return NextResponse.json(data, { status: backendRes.status });
  }

  // Binary passthrough — this is a PDF stream, not JSON, so it skips the
  // usual json()-then-NextResponse.json() pattern every other proxy route
  // here uses.
  return new NextResponse(backendRes.body, {
    status: 200,
    headers: {
      "Content-Type": backendRes.headers.get("Content-Type") ?? "application/pdf",
      "Content-Disposition": backendRes.headers.get("Content-Disposition") ?? "attachment",
    },
  });
}
