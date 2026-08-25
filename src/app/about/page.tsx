"use client";

import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { AppLogo } from "@/components/ui/AppLogo";
import { Icon, ICONS, IconName } from "@/components/ui/Icon";

const STATS = [
  { value: "5,000+", label: "Users Served" },
  { value: "50+", label: "Verified Doctors" },
  { value: "4.8★", label: "App Rating" },
  { value: "100%", label: "Confidential" },
];

const PILLARS: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "verified",
    title: "Verified Doctors",
    description:
      "Connect with licensed Sexual & Reproductive Health specialists who are vetted by the Medical & Dental Council of Nigeria.",
  },
  {
    icon: "shield",
    title: "Complete Privacy",
    description:
      "All consultations and conversations are end-to-end encrypted. Your health history is yours alone — never sold or shared.",
  },
  {
    icon: "bot",
    title: "Ask AmWell AI",
    description:
      "Our AI health assistant gives instant, evidence-based answers to sensitive SRH questions in a safe, judgement-free space.",
  },
  {
    icon: "pill",
    title: "Trusted Products",
    description:
      "A curated shop of contraceptives, supplements and SRH essentials — sourced from certified manufacturers and delivered discreetly.",
  },
];

const VALUES: { icon: IconName; statement: string }[] = [
  { icon: "verified", statement: "We believe sexual health is a human right, not a privilege." },
  { icon: "shield", statement: "We hold every piece of your data with the utmost respect and security." },
  { icon: "people", statement: "We champion an inclusive, non-judgmental approach to reproductive health." },
  { icon: "star", statement: "We continuously improve through evidence-based research and user feedback." },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-page-bg">
      <MarketingHeader />

      <main className="flex-1">
        <section className="px-5 py-16 text-center md:px-10 lg:py-20">
          <AppLogo className="mx-auto h-16 w-16" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-heading">Your Health. Your Terms.</h1>
          <p className="mx-auto mt-3 max-w-2xl text-body">
            PlanAmWell is Nigeria&apos;s trusted Sexual &amp; Reproductive Health (SRH) platform — combining expert
            medical care, AI-powered guidance and discreet product delivery in one place.
          </p>

          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="rounded-card bg-card-bg p-4 shadow-atmospheric">
                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                <p className="mt-1 text-xs text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-card-bg px-5 py-14 md:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-heading">Our Mission</h2>
            <p className="mt-3 text-body">
              To make quality Sexual &amp; Reproductive Health care accessible, affordable and completely private
              for every Nigerian — regardless of location, gender or background.
            </p>
          </div>
        </section>

        <section className="px-5 py-14 md:px-10">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold text-heading">What We Offer</h2>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {PILLARS.map((pillar) => (
                <div key={pillar.title} className="rounded-card border border-border bg-card-bg p-6 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-pink-bg text-primary">
                    <Icon path={ICONS[pillar.icon]} className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-heading">{pillar.title}</h3>
                  <p className="mt-2 text-sm text-muted">{pillar.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-card-bg px-5 py-14 md:px-10">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-2xl font-bold text-heading">Our Values</h2>
            <div className="mt-8 flex flex-col gap-4">
              {VALUES.map((value) => (
                <div key={value.statement} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-pink-bg text-primary">
                    <Icon path={ICONS[value.icon]} className="h-4 w-4" />
                  </div>
                  <p className="text-body">{value.statement}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-14 md:px-10">
          <div className="mx-auto max-w-2xl rounded-card bg-accent-blue-bg p-6 text-center">
            <h2 className="text-lg font-bold text-accent-blue-fg">Your Privacy Guarantee</h2>
            <p className="mt-2 text-sm text-accent-blue-fg">
              We never sell, share or monetise your personal health data. All data is encrypted in transit and at
              rest. You can request a full export or permanent deletion of your account at any time from your
              Profile &amp; Privacy settings.
            </p>
          </div>
        </section>

        <section className="px-5 pb-16 text-center md:px-10">
          <h2 className="text-lg font-bold text-heading">Get in Touch</h2>
          <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold text-primary">
            <a href="mailto:support@planamwell.com">support@planamwell.com</a>
            <a href="https://planamwell.com" target="_blank" rel="noopener noreferrer">
              planamwell.com
            </a>
          </div>
          <p className="mt-6 text-xs text-muted">© {new Date().getFullYear()} PlanAmWell. All rights reserved.</p>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
