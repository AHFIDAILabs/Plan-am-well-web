import { NextResponse } from "next/server";
import { BackendAuthError } from "./backendFetch";

/**
 * Runs a route handler body, turning an unauthenticated/expired session
 * (BackendAuthError, thrown by backendFetch) into a consistent 401 the
 * client-side AuthContext can react to (e.g. redirect to /login), instead
 * of every route repeating its own try/catch for this one case.
 */
export async function withAuthErrorHandling(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof BackendAuthError) {
      return NextResponse.json({ success: false, message: err.message }, { status: 401 });
    }
    throw err;
  }
}
