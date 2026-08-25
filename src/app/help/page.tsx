"use client";

import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Icon, ICONS, IconName } from "@/components/ui/Icon";

// Same real support number the Ask AmWell AI WhatsApp handoff already uses —
// not the placeholder number mobile's HelpSupport.tsx still has hardcoded.
const SUPPORT_PHONE_DIGITS = (process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+2349168767784").replace(/[^\d]/g, "");
const SUPPORT_PHONE_DISPLAY = process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+2349168767784";
const SUPPORT_EMAIL = "support@planamwell.com";

interface ContactOption {
  icon: IconName;
  title: string;
  subtitle: string;
  href: string;
  external?: boolean;
}

const CONTACT_OPTIONS: ContactOption[] = [
  {
    icon: "search",
    title: "Help Center",
    subtitle: "Browse FAQs and guides at support.planamwell.com",
    href: "https://support.planamwell.com",
    external: true,
  },
  {
    icon: "verified",
    title: "Call Support",
    subtitle: SUPPORT_PHONE_DISPLAY,
    href: `tel:${SUPPORT_PHONE_DISPLAY}`,
  },
  {
    icon: "chat",
    title: "Email Us",
    subtitle: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}?subject=PlanAmWell Support`,
  },
  {
    icon: "whatsapp",
    title: "WhatsApp Support",
    subtitle: "Quick replies, works well on slow connections",
    href: `https://wa.me/${SUPPORT_PHONE_DIGITS}?text=${encodeURIComponent(
      "Hello PlanAmWell Support, I need help with the app."
    )}`,
    external: true,
  },
];

export default function HelpSupportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-page-bg">
      <MarketingHeader />

      <main className="flex-1 px-5 py-16 md:px-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-heading">Help &amp; Support</h1>
          <p className="mt-1 text-sm text-muted">We&apos;re here to help — pick whatever works best for you.</p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CONTACT_OPTIONS.map((option) => (
              <a
                key={option.title}
                href={option.href}
                {...(option.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex items-start gap-3 rounded-card bg-card-bg p-4 shadow-atmospheric transition-shadow hover:shadow-lg"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-pink-bg text-primary">
                  <Icon path={ICONS[option.icon]} className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-heading">{option.title}</p>
                  <p className="mt-0.5 text-sm text-muted">{option.subtitle}</p>
                </div>
              </a>
            ))}
          </div>

          <div className="mt-6 rounded-card bg-accent-amber-bg p-4">
            <p className="text-sm font-semibold text-accent-amber-fg">Live Chat</p>
            <p className="mt-1 text-sm text-accent-amber-fg">
              Available Monday&ndash;Friday, 8am&ndash;6pm WAT, right from within the app. Outside those hours,
              email us and we&apos;ll get back to you as soon as we&apos;re back online.
            </p>
          </div>

          <div className="mt-10">
            <p className="text-xs font-bold uppercase tracking-wide text-heading">Legal</p>
            <div className="mt-3 flex gap-4 text-sm font-semibold text-primary">
              <Link href="/terms">Terms &amp; Conditions</Link>
              <Link href="/privacy">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
