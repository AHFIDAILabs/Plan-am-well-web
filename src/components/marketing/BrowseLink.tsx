"use client";

import Link from "next/link";
import { MouseEvent, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

/**
 * For destinations a guest is allowed to browse (doctor list/profiles,
 * Ask AmWell AI, clinics, pharmacy, community) — a fully signed-out visitor
 * (no session at all, not even a guest one) can't just Link into /app/*
 * because the middleware bounces any request with zero session back to "/".
 * This transparently starts a guest session first, then navigates, so
 * clicking "Consult a Doctor" etc. grants access without forcing sign-up —
 * matching the mobile app's guest-browsing behavior. Sign-up only gets
 * required at the point of an actual account-bound action (booking,
 * ordering, RSVPing), which the destination pages already gate themselves.
 */
export function BrowseLink({
  path,
  className,
  children,
}: {
  path: string;
  className?: string;
  children: ReactNode;
}) {
  const { user, isAnonymous, continueAsGuest } = useAuth();

  const href = user ? (user.role === "Doctor" ? "/provider" : path) : path;

  async function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (!user && !isAnonymous) {
      e.preventDefault();
      await continueAsGuest(path);
    }
  }

  return (
    // prefetch disabled: a signed-out visitor prefetching an /app/* route
    // hits proxy.ts's auth check with no session cookie, which redirects to
    // "/" — Next.js's router cache then holds onto that redirect keyed by
    // this URL. If the same visitor later logs in and clicks the equivalent
    // sidebar link (same pathname), the router can replay that stale cached
    // redirect instead of fetching fresh, bouncing them back to "/" until a
    // hard refresh clears the cache. This component already does its own
    // guest-session-then-navigate handling on click, so eager prefetching
    // never had any benefit here to trade off.
    <Link href={href} prefetch={false} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
