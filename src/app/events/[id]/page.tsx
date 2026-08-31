import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { BrowseLink } from "@/components/marketing/BrowseLink";
import { Button } from "@/components/ui/Button";
import { EventBanner } from "@/components/community/EventBanner";
import { EventShareActions } from "@/components/community/EventShareActions";
import { publicServerFetch } from "@/lib/backendFetch";
import { getPublicOriginFromHeaders } from "@/lib/publicUrl";
import { CommunityEvent, buildReferralUrl } from "@/lib/types";

function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString()}`;
}

async function fetchEvent(id: string): Promise<CommunityEvent | null> {
  try {
    const res = await publicServerFetch(`/events/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.success && data?.data ? (data.data as CommunityEvent) : null;
  } catch {
    return null;
  }
}

function eventStatus(event: CommunityEvent): "active" | "expired" {
  return new Date(event.endsAt ?? event.startsAt).getTime() < Date.now() ? "expired" : "active";
}

// This is the ONLY event page not gated by proxy.ts's /app/:path* auth
// check — deliberately so, since it's what share links, search engines, and
// link-preview bots (WhatsApp/Twitter/Slack, none of which run JS or carry a
// session cookie) actually land on. The interactive RSVP/ticket flow still
// lives at /app/community/[id]; this page hands off to it via BrowseLink,
// which transparently starts a guest session first (see BrowseLink.tsx).
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const event = await fetchEvent(id);
  if (!event) return { title: "Event not found — PlanAmWell" };

  const origin = await getPublicOriginFromHeaders();
  const url = `${origin}/events/${id}`;
  const description =
    event.description.length > 160 ? `${event.description.slice(0, 157)}...` : event.description;
  const image = event.bannerImage?.url;

  return {
    title: `${event.title} — PlanAmWell Community Hub`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: event.title,
      description,
      url,
      siteName: "PlanAmWell",
      type: "website",
      ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: event.title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function PublicEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await fetchEvent(id);
  if (!event) notFound();

  const origin = await getPublicOriginFromHeaders();
  const url = `${origin}/events/${id}`;
  const status = eventStatus(event);
  const isTicketed = !!event.ticketPriceKobo;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.startsAt,
    endDate: event.endsAt,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: event.isVirtual
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    location: event.isVirtual
      ? { "@type": "VirtualLocation", url }
      : { "@type": "Place", name: event.location || "PlanAmWell Community Hub" },
    image: event.bannerImage?.url ? [event.bannerImage.url] : undefined,
    organizer: event.organizerName ? { "@type": "Organization", name: event.organizerName } : undefined,
    offers: isTicketed
      ? {
          "@type": "Offer",
          price: (event.ticketPriceKobo! / 100).toString(),
          priceCurrency: "NGN",
          availability: "https://schema.org/InStock",
          url,
        }
      : undefined,
  };

  return (
    <div className="min-h-screen bg-page-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <MarketingHeader />

      <main className="mx-auto max-w-3xl px-5 py-12 md:px-10">
        <div className="overflow-hidden rounded-card border border-border bg-card-bg shadow-atmospheric">
          <div className="relative h-56 w-full sm:h-64">
            <EventBanner bannerImage={event.bannerImage} bannerPreset={event.bannerPreset} size="lg" />
            {event.category && (
              <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-heading shadow-sm backdrop-blur-sm">
                {event.category}
              </span>
            )}
            <span
              className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                status === "active" ? "bg-green-600 text-white" : "bg-white/90 text-muted backdrop-blur-sm"
              }`}
            >
              {status === "active" ? "Active" : "Expired"}
            </span>
          </div>

          <div className="p-6 md:p-8">
            {!!event.rsvpCount && (
              <span className="text-xs font-semibold text-tertiary">
                {event.rsvpCount} {event.rsvpCount === 1 ? "person" : "people"} going
              </span>
            )}
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-heading md:text-3xl">{event.title}</h1>
            {event.organizerName && <p className="mt-1 text-sm text-muted">Hosted by {event.organizerName}</p>}

            <dl className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase text-muted">Date &amp; time</dt>
                <dd className="mt-1 text-heading">
                  {new Date(event.startsAt).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-muted">Where</dt>
                <dd className="mt-1 text-heading">{event.isVirtual ? "Online" : event.location ?? "In person"}</dd>
              </div>
            </dl>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase text-muted">About this event</p>
              <p className="mt-1 whitespace-pre-line text-sm text-body">{event.description}</p>
            </div>

            {status === "expired" && (
              <p className="mt-6 rounded-lg bg-accent-gray-bg px-4 py-3 text-sm text-muted">
                This event has already taken place.
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              {status === "active" && (
                <BrowseLink path={`/app/community/${event._id}`}>
                  <Button>{isTicketed ? `Get Ticket (${formatNaira(event.ticketPriceKobo!)})` : "RSVP to this event"}</Button>
                </BrowseLink>
              )}

              {event.registrationUrl && (
                <a
                  href={buildReferralUrl(event.registrationUrl, event.referralCode)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-14 items-center justify-center rounded-full border border-tertiary px-6 text-sm font-semibold text-tertiary hover:bg-accent-blue-bg"
                >
                  Register with {event.organizerName || "organizer"}
                </a>
              )}
            </div>

            <div className="mt-4">
              <EventShareActions event={event} publicUrl={url} />
            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
