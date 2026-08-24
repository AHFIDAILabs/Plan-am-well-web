"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Icon, ICONS } from "@/components/ui/Icon";
import { ContinueAsGuestLink } from "@/components/auth/ContinueAsGuestLink";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { BrowseLink } from "@/components/marketing/BrowseLink";
import { useMarketingLink } from "@/lib/useMarketingLink";
import { Doctor, Partner, Product, doctorFullName, doctorImageUrl, partnerImageUrl } from "@/lib/types";

// Leaflet touches `window` on import — must be client-only, never SSR'd.
const ClinicsMapPreview = dynamic(
  () => import("@/components/marketing/ClinicsMapPreview").then((m) => m.ClinicsMapPreview),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-accent-gray-bg" /> }
);

// Reproductive-health-related imagery (contraception, family planning /
// cycle tracking) — deliberately not clinical/doctor photography.
const HERO_IMAGES = [
  "/hero/hero-repro-1.jpg",
  "/hero/hero-calendar.jpg",
  "/hero/hero-repro-2.jpg",
  "/hero/hero-planner.jpg",
];

// Rotating sample exchanges for the Ask AmWell AI row — several real-feeling
// conversations instead of one static screenshot, so that row changes over
// time the same way the hero photo does.
const CHAT_EXCHANGES: { from: "user" | "bot"; text: string }[][] = [
  [
    { from: "user", text: "Is it normal to have irregular periods on the pill?" },
    {
      from: "bot",
      text: "Very common in the first 2–3 months while your body adjusts. Here's what to expect, and when it's worth checking in with a doctor.",
    },
    { from: "user", text: "That's reassuring, thank you 💛" },
  ],
  [
    { from: "user", text: "How effective is emergency contraception after 48 hours?" },
    {
      from: "bot",
      text: "Still meaningfully effective up to 72–120 hours depending on the type, but sooner is always better. Want me to walk through the options?",
    },
  ],
  [
    { from: "user", text: "Can I get tested without my parents finding out?" },
    {
      from: "bot",
      text: "Yes — everything here is confidential, and you can browse and test completely anonymously if that's what feels safest.",
    },
    { from: "user", text: "Okay, that helps a lot." },
  ],
];

export default function LandingPage() {
  const { portalHref, user, isAnonymous } = useMarketingLink();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [chatIndex, setChatIndex] = useState(0);
  const [chatPaused, setChatPaused] = useState(false);
  const partnersRef = useRef<HTMLDivElement>(null);
  const [partnersPaused, setPartnersPaused] = useState(false);

  useEffect(() => {
    apiGet<{ success: boolean; data?: Doctor[] }>("/api/doctors").then(({ data }) => {
      if (data.success && data.data) setDoctors(data.data.slice(0, 6));
    });
    apiGet<{ success: boolean; data?: Product[] }>("/api/products?limit=4").then(({ data }) => {
      if (data.success && data.data) setProducts(data.data.slice(0, 4));
    });
    apiGet<{ success: boolean; data?: Partner[] }>("/api/partners/active").then(({ data }) => {
      if (data.success && data.data) setPartners(data.data);
    });
  }, []);

  // Auto-advance the partner carousel, matching the mobile home screen's
  // self-scrolling "Our Partners" row — pauses while the visitor is
  // interacting with it (hover/touch-scroll).
  useEffect(() => {
    const el = partnersRef.current;
    if (!el || partners.length === 0 || partnersPaused) return;
    const id = setInterval(() => {
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + 296, behavior: "smooth" });
    }, 3000);
    return () => clearInterval(id);
  }, [partners.length, partnersPaused]);

  function partnerSocialIcon(url: string): keyof typeof ICONS {
    const u = url.toLowerCase();
    if (u.includes("twitter.com") || u.includes("x.com")) return "twitter";
    if (u.includes("instagram.com")) return "instagram";
    if (u.includes("linkedin.com")) return "linkedin";
    if (u.includes("facebook.com")) return "facebook";
    return "link";
  }

  useEffect(() => {
    if (heroPaused) return;
    const id = setInterval(() => setHeroIndex((i) => (i + 1) % HERO_IMAGES.length), 4500);
    return () => clearInterval(id);
  }, [heroPaused]);

  useEffect(() => {
    if (chatPaused) return;
    const id = setInterval(() => setChatIndex((i) => (i + 1) % CHAT_EXCHANGES.length), 5000);
    return () => clearInterval(id);
  }, [chatPaused]);

  return (
    <div className="flex min-h-screen flex-col bg-page-bg">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero — auto-changing reproductive-health imagery as a full-bleed
            background, dissolved behind the text on the left and vivid on
            the right, rather than boxed into a separate side panel. */}
        <section
          className="relative isolate flex min-h-125 items-center overflow-hidden px-5 py-16 md:px-10 lg:min-h-175 lg:py-24"
          onMouseEnter={() => setHeroPaused(true)}
          onMouseLeave={() => setHeroPaused(false)}
        >
          <div className="absolute inset-0 -z-20">
            {HERO_IMAGES.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
                  i === heroIndex ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
          </div>

          {/* Scrim: solid page-bg behind the text on the left, dissolving to
              fully transparent by the right edge so the photo reads vivid there. */}
          <div className="absolute inset-0 -z-10 bg-linear-to-r from-page-bg from-35% via-page-bg/85 via-55% to-transparent" />

          <div className="mx-auto w-full max-w-6xl">
            <div className="flex max-w-xl flex-col gap-6">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-input-bg px-4 py-2 text-primary shadow-sm">
                <Icon path={ICONS.shield} className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wide">
                  Telehealth &amp; Reproductive Freedom for Nigeria
                </span>
              </div>

              <h1 className="text-4xl font-bold leading-tight text-heading sm:text-5xl">
                Confidential, non-judgmental sexual &amp; reproductive healthcare.
              </h1>

              <div className="mt-1 flex flex-wrap gap-2.5">
                <div className="flex items-center gap-2 rounded-full border border-border bg-card-bg px-4 py-2.5 text-xs font-semibold text-body shadow-atmospheric">
                  <Icon path={ICONS.lock} className="h-4 w-4 text-primary" />
                  100% Private (AES-256 Encrypted)
                </div>
                <div className="flex items-center gap-2 rounded-full border border-border bg-card-bg px-4 py-2.5 text-xs font-semibold text-body shadow-atmospheric">
                  <Icon path={ICONS.box} className="h-4 w-4 text-secondary" />
                  Discreet Boxes (Plain Packaging)
                </div>
                <div className="flex items-center gap-2 rounded-full border border-border bg-card-bg px-4 py-2.5 text-xs font-semibold text-body shadow-atmospheric">
                  <Icon path={ICONS.award} className="h-4 w-4 text-tertiary" />
                  MDCN Verified Doctors
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <BrowseLink path="/app/doctors" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto">
                    <Icon path={ICONS.video} className="h-4 w-4" />
                    Consult a Doctor
                  </Button>
                </BrowseLink>
                <BrowseLink path="/app/ask-amwell" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Icon path={ICONS.bot} className="h-4 w-4" />
                    Ask AmWell AI
                  </Button>
                </BrowseLink>
              </div>

              <Link
                href={portalHref}
                className="group inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Open Patient Portal
                <Icon path={ICONS.arrowRight} className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Safe Space badge, floating over the vivid right side of the photo */}
            <div className="absolute bottom-8 right-5 hidden items-center gap-4 rounded-2xl border border-border/50 bg-card-bg/90 p-5 shadow-atmospheric backdrop-blur-sm md:right-10 lg:flex">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-amber-bg text-accent-amber-fg">
                <Icon path={ICONS.shield} className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-heading">Safe Space</p>
                <p className="text-xs text-muted">Guaranteed &amp; Monitored</p>
              </div>
            </div>

            {HERO_IMAGES.length > 1 && (
              <div className="absolute bottom-4 right-5 flex gap-1.5 md:right-10 lg:bottom-32">
                {HERO_IMAGES.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    aria-label={`Show image ${i + 1}`}
                    onClick={() => setHeroIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === heroIndex ? "w-6 bg-primary" : "w-1.5 bg-primary/30 hover:bg-primary/50"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* How We Can Help — alternating editorial rows instead of a uniform
            icon grid, so each feature gets its own visual moment rather than
            four re-skins of the same card recipe. */}
        <section className="overflow-hidden bg-card-bg px-5 py-20 md:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-20 max-w-xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">What we offer</p>
              <h2 className="mt-3 text-3xl font-bold text-heading sm:text-4xl">
                Care that meets you{" "}
                <span className="relative inline-block">
                  where you are
                  <svg
                    viewBox="0 0 200 14"
                    className="absolute -bottom-2 left-0 h-3 w-full text-primary/60"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M2 10 C 40 2, 80 2, 100 8 S 160 14, 198 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                .
              </h2>
              <p className="mt-5 text-base text-muted">No two people need the same thing. Pick a starting point.</p>
            </div>

            <div className="flex flex-col gap-16">
              {/* 01 — Ask AmWell AI: rotating real-feeling exchanges, bled
                  full-width behind the text exactly like the hero photo. */}
              <div
                className="relative isolate flex min-h-100 items-center overflow-hidden rounded-[40px] px-8 py-10 md:px-14"
                onMouseEnter={() => setChatPaused(true)}
                onMouseLeave={() => setChatPaused(false)}
              >
                <div className="absolute inset-0 -z-20 bg-accent-blue-bg" />
                <div className="absolute inset-0 -z-10 bg-linear-to-r from-page-bg from-40% via-page-bg/85 via-58% to-transparent" />

                <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[45%] flex-col justify-center gap-3 px-10 md:flex">
                  {CHAT_EXCHANGES.map((exchange, ei) => (
                    <div
                      key={ei}
                      className={`absolute inset-x-10 flex flex-col gap-3 transition-opacity duration-700 ${
                        ei === chatIndex ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {exchange.map((msg, mi) =>
                        msg.from === "user" ? (
                          <div
                            key={mi}
                            className="ml-auto max-w-[85%] rounded-[18px_18px_4px_18px] bg-primary px-4 py-2.5 text-sm text-white shadow-lg"
                          >
                            {msg.text}
                          </div>
                        ) : (
                          <div
                            key={mi}
                            className="mr-auto max-w-[90%] rounded-[18px_18px_18px_4px] bg-card-bg px-4 py-2.5 text-sm text-heading shadow-lg"
                          >
                            {msg.text}
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
                <div className="pointer-events-none absolute bottom-6 right-8 hidden items-center gap-2 rounded-full bg-card-bg px-4 py-2 shadow-lg md:flex">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                  <span className="text-xs font-semibold text-heading">Online now</span>
                </div>

                <div className="relative z-10 max-w-md">
                  <span className="text-5xl font-black text-border">01</span>
                  <h3 className="mt-3 text-2xl font-bold text-heading">Ask AmWell AI, day or night.</h3>
                  <p className="mt-4 text-base text-muted">
                    Type the question you&apos;ve been sitting on at 2am. No appointment, no waiting room, no name
                    attached unless you want one — just a straight answer, backed by medically verified knowledge.
                  </p>
                  <BrowseLink
                    path="/app/ask-amwell"
                    className="group mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-tertiary hover:underline"
                  >
                    Start a conversation
                    <Icon path={ICONS.arrowRight} className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </BrowseLink>
                </div>
              </div>

              {/* 02 — Consult a Doctor: real photo, layered/organic frame */}
              <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <div className="pointer-events-none absolute -left-10 top-1/2 -z-10 h-100 w-100 -translate-y-1/2 rounded-full bg-accent-pink-bg opacity-70 blur-3xl" />
                <div className="flex justify-center">
                  <div className="relative w-full max-w-sm">
                    <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-tl-[72px] rounded-br-[72px] bg-primary-container/25" />
                    <div className="relative aspect-4/5 -rotate-2 overflow-hidden rounded-tl-[72px] rounded-br-[72px] shadow-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/team/doctor-1.jpg" alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="absolute -bottom-4 -right-4 flex items-center gap-2 rounded-2xl bg-card-bg px-4 py-3 shadow-lg ring-1 ring-border/60">
                      <Icon path={ICONS.verified} className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-heading">MDCN Verified</span>
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-5xl font-black text-border">02</span>
                  <h3 className="mt-3 text-2xl font-bold text-heading">Talk to a doctor who actually listens.</h3>
                  <p className="mt-4 max-w-md text-base text-muted">
                    Video, voice, or chat — whichever feels less exposed. Every doctor on PlanAmWell is MDCN-verified,
                    and the session stays between the two of you.
                  </p>
                  <BrowseLink
                    path="/app/doctors"
                    className="group mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    Browse doctors
                    <Icon path={ICONS.arrowRight} className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </BrowseLink>
                </div>
              </div>

              {/* 03 — Order Products: real product photo, opposite tilt */}
              <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <div className="pointer-events-none absolute -right-10 top-1/2 -z-10 h-100 w-100 -translate-y-1/2 rounded-full bg-accent-amber-bg opacity-70 blur-3xl" />
                <div className="order-2 lg:order-1">
                  <span className="text-5xl font-black text-border">03</span>
                  <h3 className="mt-3 text-2xl font-bold text-heading">Delivered in a plain box. No questions.</h3>
                  <p className="mt-4 max-w-md text-base text-muted">
                    Contraceptives, test kits, wellness essentials — packed the same way whatever&apos;s inside, and
                    paid for the same way too. Nobody at your door needs to know what it is.
                  </p>
                  <BrowseLink
                    path="/app/pharmacy"
                    className="group mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-secondary hover:underline"
                  >
                    Shop the pharmacy
                    <Icon path={ICONS.arrowRight} className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </BrowseLink>
                </div>
                <div className="order-1 flex justify-center lg:order-2">
                  <div className="relative w-full max-w-sm">
                    <div className="absolute inset-0 -translate-x-4 translate-y-4 rounded-tr-[72px] rounded-bl-[72px] bg-accent-amber-bg" />
                    <div className="relative aspect-4/5 rotate-2 overflow-hidden rounded-tr-[72px] rounded-bl-[72px] shadow-xl">
                      {products[0]?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={products[0].imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-accent-amber-bg">
                          <Icon path={ICONS.pill} className="h-16 w-16 text-accent-amber-fg/50" />
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-2xl bg-card-bg px-4 py-3 shadow-lg ring-1 ring-border/60">
                      <Icon path={ICONS.box} className="h-4 w-4 text-secondary" />
                      <span className="text-xs font-semibold text-heading">Unmarked packaging</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 04 — Find Clinics: a real, live, pannable map filling the
                  row as its background — not an illustration, the actual
                  product — with the scrim letting it stay fully interactive. */}
              <div className="relative isolate flex min-h-100 items-center overflow-hidden rounded-[40px] px-8 py-10 md:px-14">
                <div className="absolute inset-0 -z-20">
                  <ClinicsMapPreview />
                </div>
                <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-l from-page-bg from-40% via-page-bg/85 via-58% to-transparent" />

                <BrowseLink
                  path="/app/clinics"
                  className="absolute bottom-6 left-8 z-400 flex items-center gap-2 rounded-2xl bg-card-bg px-3.5 py-2.5 shadow-lg transition-transform hover:scale-105"
                >
                  <Icon path={ICONS.verified} className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-heading">Open full map</span>
                </BrowseLink>

                <div className="relative z-10 ml-auto max-w-md text-right">
                  <span className="text-5xl font-black text-border">04</span>
                  <h3 className="mt-3 text-2xl font-bold text-heading">Verified clinics, wherever you are.</h3>
                  <p className="mt-4 text-base text-muted">
                    For the times you&apos;d rather see someone in person. Every clinic on the map is youth-friendly
                    and vetted for how they treat the people who walk in.
                  </p>
                  <BrowseLink
                    path="/app/clinics"
                    className="group mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-tertiary hover:underline"
                  >
                    Find a clinic near you
                    <Icon path={ICONS.arrowRight} className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </BrowseLink>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Meet Our Verified Doctors */}
        {doctors.length > 0 && (
          <section className="px-5 py-20 md:px-10">
            <div className="mx-auto max-w-6xl">
              <div className="mx-auto mb-14 max-w-2xl text-center">
                <h2 className="text-3xl font-bold text-heading">Meet Our Verified Doctors</h2>
                <p className="mt-3 text-base text-muted">Compassionate, non-judgmental experts ready to support you.</p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {doctors.slice(0, 3).map((doctor) => {
                  const imageUrl = doctorImageUrl(doctor);
                  return (
                    <div
                      key={doctor._id}
                      className="group overflow-hidden rounded-card border border-border bg-card-bg shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                    >
                      <div className="relative h-56 bg-accent-pink-bg">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageUrl}
                            alt={doctorFullName(doctor)}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Icon path={ICONS.person} className="h-12 w-12 text-primary/40" />
                          </div>
                        )}
                        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-accent-amber-bg px-3 py-1.5 text-xs font-semibold text-accent-amber-fg shadow-sm">
                          <Icon path={ICONS.shield} className="h-3.5 w-3.5" /> Safe Space
                        </div>
                        {!!doctor.ratings && (
                          <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-card-bg/90 px-2.5 py-1 text-xs font-bold text-primary shadow-sm backdrop-blur-sm">
                            <Icon path={ICONS.star} className="h-3.5 w-3.5" />
                            {doctor.ratings.toFixed(1)}
                          </div>
                        )}
                      </div>
                      <div className="p-6">
                        <div className="mb-2 flex items-center gap-2 text-primary">
                          <Icon path={ICONS.verified} className="h-4 w-4" />
                          <span className="text-xs font-bold uppercase tracking-wide">MDCN Verified</span>
                        </div>
                        <h3 className="text-lg font-semibold text-heading">{doctorFullName(doctor)}</h3>
                        <p className="mt-1 text-sm text-muted">{doctor.specialization}</p>
                        <BrowseLink path={`/app/doctors/${doctor._id}`} className="mt-4 block">
                          <Button variant="outline" className="w-full">
                            Book Consultation
                          </Button>
                        </BrowseLink>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Discreet Essentials Shop */}
        {products.length > 0 && (
          <section className="bg-card-bg px-5 py-20 md:px-10">
            <div className="mx-auto max-w-6xl">
              <div className="mb-14 flex flex-col items-end justify-between gap-6 md:flex-row">
                <div className="max-w-2xl">
                  <h2 className="text-3xl font-bold text-heading">Discreet Essentials Shop</h2>
                  <p className="mt-3 text-base text-muted">Your privacy is our priority. All items ship in plain, unmarked boxes.</p>
                </div>
                <BrowseLink
                  path="/app/pharmacy"
                  className="group inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-primary hover:underline"
                >
                  Shop All Products
                  <Icon path={ICONS.arrowRight} className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </BrowseLink>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {products.map((product) => {
                  const inStock = product.stockQuantity > 0 && product.status !== "OUT_OF_STOCK";
                  return (
                    <BrowseLink key={product._id} path={`/app/pharmacy/${product._id}`} className="group block">
                      <div className="relative mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-input-bg">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <Icon path={ICONS.pill} className="h-16 w-16 text-muted opacity-30" />
                        )}
                        {!inStock && (
                          <span className="absolute left-0 top-3 rounded-r-lg bg-error px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-on-error">
                            Sold Out
                          </span>
                        )}
                        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-border/40 bg-card-bg/90 px-3 py-1.5 text-xs font-semibold text-muted backdrop-blur-sm">
                          <Icon path={ICONS.box} className="h-3.5 w-3.5" /> Unmarked Packaging
                        </div>
                      </div>
                      <h4 className="text-base font-semibold text-heading transition-colors group-hover:text-primary">
                        {product.name}
                      </h4>
                      {product.manufacturerName && <p className="text-xs text-muted">{product.manufacturerName}</p>}
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-sm font-semibold text-primary">₦{product.price.toLocaleString()}</p>
                        <span className={`text-xs font-semibold ${inStock ? "text-green-600" : "text-error"}`}>
                          {inStock ? "In stock" : "Unavailable"}
                        </span>
                      </div>
                    </BrowseLink>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Our Partners */}
        {partners.length > 0 && (
          <section className="bg-card-bg px-5 py-20 md:px-10">
            <div className="mx-auto max-w-6xl">
              <div className="mb-10 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-heading">Our Partners</h2>
                  <p className="mt-3 text-base text-muted">Organizations and clinicians working with us to expand access to care.</p>
                </div>
              </div>

              <div
                ref={partnersRef}
                onMouseEnter={() => setPartnersPaused(true)}
                onMouseLeave={() => setPartnersPaused(false)}
                onTouchStart={() => setPartnersPaused(true)}
                className="scrollbar-none flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden"
              >
                {partners.map((partner) => {
                  const imgUrl = partnerImageUrl(partner);
                  return (
                    <div
                      key={partner._id}
                      className="flex w-70 shrink-0 items-center gap-4 rounded-card border border-border bg-page-bg p-4 shadow-sm"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-accent-blue-bg">
                        {imgUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgUrl} alt={partner.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xl font-bold text-accent-blue-fg">
                            {partner.name[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-heading">{partner.name}</p>
                        <p className="truncate text-sm text-muted">{partner.profession}</p>
                        {partner.socialLinks.length > 0 && (
                          <div className="mt-1.5 flex gap-2">
                            {partner.socialLinks.slice(0, 4).map((link) => (
                              <a
                                key={link}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-tertiary hover:text-primary"
                              >
                                <Icon path={ICONS[partnerSocialIcon(link)]} className="h-4 w-4" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Fallback CTA if guest wants to browse without registering */}
        {!user && !isAnonymous && (
          <section className="px-5 pb-16 text-center md:px-10">
            <ContinueAsGuestLink />
          </section>
        )}
      </main>

      <MarketingFooter />
    </div>
  );
}
