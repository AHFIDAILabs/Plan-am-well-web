"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Icon, ICONS, IconName } from "@/components/ui/Icon";
import { TopBar } from "@/components/layout/TopBar";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export function PortalShell({
  navItems,
  variant,
  notificationsHref,
  profileHref,
  children,
}: {
  navItems: NavItem[];
  variant: "patient" | "provider";
  notificationsHref: string;
  profileHref: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { user, isAnonymous, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-page-bg">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 -translate-x-full flex-col border-r border-border bg-card-bg transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : ""
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="" className="h-8 w-8 object-contain" />
          <span className="text-base font-black tracking-tight text-heading">
            Plan<span className="text-primary">Am</span><span className="text-secondary">Well</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/app" && item.href !== "/provider" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-xs font-semibold transition-colors ${
                  active ? "bg-accent-pink-bg text-primary" : "text-accent-gray-fg hover:bg-black/5 hover:text-heading"
                }`}
              >
                <Icon path={ICONS[item.icon]} className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <div className="mb-2 rounded-2xl bg-input-bg p-2.5">
            {isAnonymous ? (
              <>
                <p className="truncate text-xs font-bold text-heading">Browsing as Guest</p>
                <Link href="/register" className="text-[10px] font-semibold text-primary hover:underline">
                  Create a free account &rarr;
                </Link>
              </>
            ) : (
              <>
                <p className="truncate text-xs font-bold text-heading">{user?.name || user?.email}</p>
                <p className="truncate text-[10px] text-muted">
                  {user?.role === "User" && user?.pseudonym ? `also known as ${user.pseudonym}` : user?.role}
                </p>
              </>
            )}
          </div>
          <button
            onClick={() => logout()}
            className="w-full rounded-full py-2 text-xs font-bold text-red-600 hover:bg-red-50"
          >
            {isAnonymous ? "End Guest Session" : "Sign Out"}
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          variant={variant}
          onMenuClick={() => setMobileOpen(true)}
          notificationsHref={notificationsHref}
          profileHref={profileHref}
        />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
