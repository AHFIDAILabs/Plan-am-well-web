import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backendFetch";
import { withAuthErrorHandling } from "@/lib/routeHelpers";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const body = await req.json();
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;
  const VALID_LANGUAGES = ["en", "yo", "ig", "ha", "pcm"];
  const language = VALID_LANGUAGES.includes(body.language) ? body.language : "en";

  if (!message) {
    return NextResponse.json({ success: false, message: "message is required" }, { status: 400 });
  }

  const session = await getSession();

  return withAuthErrorHandling(async () => {
    const backendRes = await backendFetch(req, "/chatbot/message", {
      method: "POST",
      body: JSON.stringify({ message, sessionId, userId: session.user?.id, language }),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  });
}
