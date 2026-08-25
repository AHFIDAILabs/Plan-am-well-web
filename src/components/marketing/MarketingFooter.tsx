"use client";

import Link from "next/link";
import { AppLogo } from "@/components/ui/AppLogo";
import { BrowseLink } from "@/components/marketing/BrowseLink";
import { Icon, ICONS, IconName } from "@/components/ui/Icon";

// Mirrors the platform + placeholder handles used by the mobile app's own
// SocialSticky widget (components/socials/socialMedia.tsx) — those URLs are
// still unwired placeholders there too, so we keep them as-is rather than
// inventing real-looking handles.
const SOCIAL_LINKS: { name: IconName; url: string; color: string; label: string }[] = [
  { name: "facebook", url: "https://facebook.com/yourpage", color: "#4267B2", label: "Facebook" },
  { name: "instagram", url: "https://instagram.com/yourpage", color: "#C13584", label: "Instagram" },
  { name: "twitter", url: "https://twitter.com/yourpage", color: "#1DA1F2", label: "Twitter" },
  { name: "linkedin", url: "https://linkedin.com/yourpage", color: "#0077B5", label: "LinkedIn" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-accent-gray-bg px-5 py-10 md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:justify-between">
        <div className="flex max-w-xs flex-col gap-3">
          <div className="flex items-center gap-2">
            <AppLogo className="h-9 w-9" />
            <span className="text-lg font-bold text-primary">PlanAmWell</span>
          </div>
          <p className="text-xs text-muted">
            Confidential, non-judgmental sexual &amp; reproductive healthcare for young people in Nigeria.
          </p>
          <div className="mt-1 flex items-center gap-2">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-card-bg shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
              >
                <Icon path={ICONS[social.name]} className="h-4 w-4" style={{ color: social.color }} />
              </a>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-heading">Platform</p>
            <nav className="mt-3 flex flex-col gap-2 text-xs font-semibold text-muted">
              <Link href="/services" className="hover:text-primary">
                Services
              </Link>
              <BrowseLink path="/app/doctors" className="hover:text-primary">
                Consult a Doctor
              </BrowseLink>
              <BrowseLink path="/app/pharmacy" className="hover:text-primary">
                Pharmacy
              </BrowseLink>
              <BrowseLink path="/app/community" className="hover:text-primary">
                Community Hub
              </BrowseLink>
            </nav>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-heading">For Providers</p>
            <nav className="mt-3 flex flex-col gap-2 text-xs font-semibold text-muted">
              <Link href="/register/doctor" className="hover:text-primary">
                Medical Verification
              </Link>
              <Link href="/login" className="hover:text-primary">
                Provider Sign In
              </Link>
            </nav>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-heading">Company</p>
            <nav className="mt-3 flex flex-col gap-2 text-xs font-semibold text-muted">
              <Link href="/about" className="hover:text-primary">
                About Us
              </Link>
              <Link href="/help" className="hover:text-primary">
                Help &amp; Support
              </Link>
              <Link href="/privacy" className="hover:text-primary">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-primary">
                Terms of Service
              </Link>
            </nav>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-6xl border-t border-border/70 pt-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} PlanAmWell. Discreet Care Always.
      </div>
    </footer>
  );
}
