import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { getSession } from "@/lib/session";
import { verifyCsrf, csrfRejection } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return csrfRejection();
  }

  const session = await getSession();
  if (
    !session.accessToken ||
    session.isAnonymous ||
    !session.webauthn?.challenge ||
    !session.webauthn.credentialId ||
    !session.webauthn.publicKey
  ) {
    return NextResponse.json({ success: false, message: "No biometric challenge in progress" }, { status: 400 });
  }

  const body = await req.json();
  const rpID = new URL(req.url).hostname;
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  try {
    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: session.webauthn.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: session.webauthn.credentialId,
        publicKey: new Uint8Array(Buffer.from(session.webauthn.publicKey, "base64url")),
        counter: session.webauthn.counter ?? 0,
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ success: false, message: "Verification failed" }, { status: 400 });
    }

    session.webauthn.counter = verification.authenticationInfo.newCounter;
    session.webauthn.challenge = undefined;
    await session.save();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message ?? "Verification failed" }, { status: 400 });
  }
}
