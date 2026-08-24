import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";

// The BFF session: the browser only ever holds an encrypted, httpOnly cookie
// wrapping this shape. It never sees accessToken/refreshToken directly — only
// Next.js server code (route handlers, backendFetch) can decrypt and read
// them. All API calls from the client go through Next.js routes that attach
// these tokens server-side before proxying to the real Express backend.
export interface SessionUser {
  id: string;
  role: "User" | "Doctor" | "Admin";
  name?: string;
  email?: string;
}

export interface SessionData {
  accessToken?: string;
  refreshToken?: string;
  user?: SessionUser;
  // Guest sessions (POST /auth/guest) carry a sessionId + isAnonymous flag
  // instead of a user — no refreshToken either (the backend never issues one
  // for guests; the JWT just hard-expires after 3 days with no rotation
  // path). `user` stays undefined for the whole lifetime of a guest session.
  sessionId?: string;
  isAnonymous?: boolean;
  // Single-device WebAuthn credential for the optional biometric re-auth
  // gate in front of Medical Records. Stored in this session's encrypted
  // cookie only — there is no backend model for it, so it does not follow
  // the user across devices/browsers (deliberate: see design.md).
  webauthn?: {
    challenge?: string;
    credentialId?: string; // base64url
    publicKey?: string; // base64url-encoded COSE public key
    counter?: number;
  };
}

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error(
    "SESSION_SECRET env var must be set to a random string of at least 32 characters (used to encrypt the session cookie)."
  );
}

const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: "paw_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax rather than Strict: Strict would drop the cookie on a user
    // following a link into the app from outside (e.g. a notification
    // email), forcing an unnecessary re-login. Lax still blocks cross-site
    // POST/PUT/DELETE, which covers the CSRF vectors that matter for a
    // cookie-based session.
    sameSite: "lax" as const,
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
