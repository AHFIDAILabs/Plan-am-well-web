"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AppLogo } from "@/components/ui/AppLogo";
import { Icon, ICONS } from "@/components/ui/Icon";
import { QuickExitButton } from "@/components/safety/QuickExitButton";
import { BrowseLink } from "@/components/marketing/BrowseLink";
import { useMarketingLink } from "@/lib/useMarketingLink";

// Pharmacy/Community are guest-browsable (BrowseLink) — only actual ordering
// or RSVPing requires a real account, gated on the destination pages
// themselves. Home/Services are plain public pages either way.
const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Pharmacy", inAppPath: "/app/pharmacy" },
  { label: "Community", inAppPath: "/app/community" },
] as const;

export function MarketingHeader() {
  const pathname = usePathname();
  const { go, user, isAnonymous } = useMarketingLink();
  const [menuOpen, setMenuOpen] = useState(false);

  const signedIn = !!user || isAnonymous;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card-bg/95 backdrop-blur-sm">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 md:px-10">
        <Link href="/" className="flex items-center gap-2">
          <AppLogo className="h-11 w-11" />
          <span className="text-lg font-bold text-primary">PlanAmWell</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-body lg:flex">
          {NAV_ITEMS.map((item) => {
            const href = "href" in item ? item.href : item.inAppPath;
            const active = pathname === href;
            const linkClassName = `transition-colors hover:text-primary ${active ? "text-primary" : ""}`;
            return "href" in item ? (
              <Link key={item.label} href={item.href} className={linkClassName}>
                {item.label}
              </Link>
            ) : (
              <BrowseLink key={item.label} path={item.inAppPath} className={linkClassName}>
                {item.label}
              </BrowseLink>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {signedIn ? (
            <Link
              href={go("/app/doctors")}
              className="hidden items-center gap-2 rounded-full bg-primary-container px-6 py-3 text-sm font-semibold text-on-primary-container shadow-sm transition-all hover:bg-primary hover:text-white md:inline-flex"
            >
              <Icon path={ICONS.video} className="h-4 w-4" />
              Consult a Doctor
            </Link>
          ) : (
            <div className="hidden items-center gap-4 md:flex">
              <Link href="/login" className="text-sm font-semibold text-body hover:text-primary">
                Sign In
              </Link>
              <Link href="/register">
                <Button className="text-sm">Get Started</Button>
              </Link>
            </div>
          )}
          <QuickExitButton />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full p-2 text-body hover:bg-black/5 lg:hidden"
            aria-label="Toggle menu"
          >
            <Icon path={menuOpen ? ICONS.close : ICONS.menu} className="h-6 w-6" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-border px-5 py-3 text-sm font-semibold text-body lg:hidden">
          {NAV_ITEMS.map((item) =>
            "href" in item ? (
              <Link key={item.label} href={item.href} className="rounded-lg px-2 py-2 hover:bg-black/5">
                {item.label}
              </Link>
            ) : (
              <BrowseLink key={item.label} path={item.inAppPath} className="rounded-lg px-2 py-2 hover:bg-black/5">
                {item.label}
              </BrowseLink>
            )
          )}
          {signedIn ? (
            <Link href={go("/app/doctors")} className="rounded-lg px-2 py-2 font-bold text-primary hover:bg-black/5">
              Consult a Doctor
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-2 py-2 hover:bg-black/5">
                Sign In
              </Link>
              <Link href="/register" className="rounded-lg px-2 py-2 font-bold text-primary hover:bg-black/5">
                Get Started
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
