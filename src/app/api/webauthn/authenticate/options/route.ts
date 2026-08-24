import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getSession } from "@/lib/session";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const session = await getSession();
  if (!session.accessToken || session.isAnonymous || !session.webauthn?.credentialId) {
    return NextResponse.json({ success: false, message: "No biometric credential registered" }, { status: 400 });
  }

  const rpID = new URL(req.url).hostname;

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: [{ id: session.webauthn.credentialId }],
    userVerification: "preferred",
  });

  session.webauthn = { ...session.webauthn, challenge: options.challenge };
  await session.save();

  return NextResponse.json({ success: true, options });
}
