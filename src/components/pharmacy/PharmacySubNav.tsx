"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app/pharmacy", label: "Products" },
  { href: "/app/cart", label: "Cart" },
  { href: "/app/orders", label: "Order History" },
];

export function PharmacySubNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex gap-2 border-b border-border">
      {TABS.map((tab) => {
        const active = pathname === tab.href || (tab.href !== "/app/pharmacy" && pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
              active ? "border-primary text-primary" : "border-transparent text-muted hover:text-heading"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
