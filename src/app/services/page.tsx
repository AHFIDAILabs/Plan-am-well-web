"use client";

import Link from "next/link";
import { Icon, ICONS, IconName } from "@/components/ui/Icon";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { BrowseLink } from "@/components/marketing/BrowseLink";
import { useMarketingLink } from "@/lib/useMarketingLink";

interface Service {
  icon: IconName;
  title: string;
  description: string;
  path: string;
  accent: "blue" | "pink" | "amber" | "gray";
  // Whether a guest (no account at all) can browse this feature, matching
  // the mobile app: browsing is open, only account-bound actions (booking,
  // ordering, RSVPing) require sign-up. Records/Reminders are genuinely
  // account-only on the backend, so those still funnel straight to sign-up.
  guestBrowsable: boolean;
}

const SERVICES: Service[] = [
  {
    icon: "bot",
    title: "Ask AmWell AI",
    description: "Instant, judgement-free answers to your sexual health questions, available 24/7 and completely anonymous.",
    path: "/app/ask-amwell",
    accent: "blue",
    guestBrowsable: true,
  },
  {
    icon: "video",
    title: "Consult a Doctor",
    description: "Secure, encrypted video, voice, or chat consultations with MDCN-verified professionals who respect your privacy.",
    path: "/app/doctors",
    accent: "pink",
    guestBrowsable: true,
  },
  {
    icon: "pill",
    title: "Order Products",
    description: "Contraceptives, test kits, and wellness essentials delivered straight to your door in plain, unmarked packaging.",
    path: "/app/pharmacy",
    accent: "amber",
    guestBrowsable: true,
  },
  {
    icon: "pin",
    title: "Find Clinics",
    description: "Locate verified, youth-friendly clinics and pharmacies near you that uphold our standards of care and discretion.",
    path: "/app/clinics",
    accent: "gray",
    guestBrowsable: true,
  },
  {
    icon: "users",
    title: "Community Hub",
    description: "Live events, support sessions, and community discussions — RSVP under a chosen name if you'd like.",
    path: "/app/community",
    accent: "blue",
    guestBrowsable: true,
  },
  {
    icon: "folder",
    title: "Medical Records Vault",
    description: "Your consultation history, encrypted and stored securely, with an optional biometric lock for extra privacy.",
    path: "/app/records",
    accent: "pink",
    guestBrowsable: false,
  },
  {
    icon: "alarm",
    title: "Med Reminders",
    description: "Private medication reminders — give any of them a discreet display name if you'd like.",
    path: "/app/reminders",
    accent: "amber",
    guestBrowsable: false,
  },
  {
    icon: "article",
    title: "Health Articles",
    description: "Educational content, success stories, and policy briefs on sexual and reproductive health, written for you.",
    path: "/app/articles",
    accent: "gray",
    guestBrowsable: true,
  },
];

const ACCENT_CLASSES: Record<Service["accent"], string> = {
  blue: "bg-accent-blue-bg text-accent-blue-fg",
  pink: "bg-accent-pink-bg text-accent-pink-fg",
  amber: "bg-accent-amber-bg text-accent-amber-fg",
  gray: "bg-accent-gray-bg text-accent-gray-fg",
};

export default function ServicesPage() {
  const { go } = useMarketingLink();

  return (
    <div className="flex min-h-screen flex-col bg-page-bg">
      <MarketingHeader />

      <main className="flex-1">
        <section className="px-5 py-16 md:px-10 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold leading-tight text-heading sm:text-5xl">Our Services</h1>
            <p className="mt-4 text-base text-muted">
              Everything you need for confidential, non-judgmental sexual and reproductive healthcare — all in one
              place.
            </p>
          </div>
        </section>

        <section className="px-5 pb-20 md:px-10">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((service) => {
              const cardClassName =
                "group flex flex-col rounded-card border border-border bg-card-bg p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg";
              const cardContent = (
                <>
                  <div
                    className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 ${ACCENT_CLASSES[service.accent]}`}
                  >
                    <Icon path={ICONS[service.icon]} className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-heading">{service.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted">{service.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Explore <Icon path={ICONS.arrowRight} className="h-4 w-4" />
                  </span>
                </>
              );
              return service.guestBrowsable ? (
                <BrowseLink key={service.path} path={service.path} className={cardClassName}>
                  {cardContent}
                </BrowseLink>
              ) : (
                <Link key={service.path} href={go(service.path)} className={cardClassName}>
                  {cardContent}
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
