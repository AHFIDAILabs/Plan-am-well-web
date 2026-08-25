"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { logScreenView } from "@/lib/analytics";

// Mirrors App.tsx's onStateChange screen-view logging on mobile — mounted
// once at the root layout so every route change reports a screen_view
// automatically, without each page needing to call logScreenView itself.
export function ScreenViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    logScreenView(pathname);
  }, [pathname]);

  return null;
}
