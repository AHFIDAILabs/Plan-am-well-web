"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";

/**
 * Auth-aware routing for public/marketing pages: a signed-in user (or an
 * active guest session) should land straight in the app, not get bounced
 * through registration again — only a fully signed-out visitor needs the
 * "create an account" funnel.
 */
export function useMarketingLink() {
  const { user, isAnonymous } = useAuth();

  const go = useMemo(() => {
    return (inAppPath: string, signedOutFallback = "/register") => {
      if (user) return user.role === "Doctor" ? "/provider" : inAppPath;
      if (isAnonymous) return inAppPath;
      return signedOutFallback;
    };
  }, [user, isAnonymous]);

  const portalHref = user ? (user.role === "Doctor" ? "/provider" : "/app") : isAnonymous ? "/app" : "/login";

  return { go, portalHref, user, isAnonymous };
}
