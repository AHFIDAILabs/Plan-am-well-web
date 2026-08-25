"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Icon, ICONS, IconName } from "@/components/ui/Icon";
import { Partner, partnerImageUrl } from "@/lib/types";

function socialIconFor(url: string): IconName {
  const lower = url.toLowerCase();
  if (lower.includes("twitter.com") || lower.includes("x.com")) return "twitter";
  if (lower.includes("instagram.com")) return "instagram";
  if (lower.includes("linkedin.com")) return "linkedin";
  if (lower.includes("facebook.com")) return "facebook";
  return "link";
}

function PartnerAvatar({ partner, size }: { partner: Partner; size: "sm" | "lg" }) {
  const imageUrl = partnerImageUrl(partner);
  const dims = size === "sm" ? "h-14 w-14 text-lg" : "h-20 w-20 text-2xl";
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt={partner.name} className={`${dims} shrink-0 rounded-full object-cover`} />
    );
  }
  return (
    <div className={`${dims} flex shrink-0 items-center justify-center rounded-full bg-accent-pink-bg font-bold text-primary`}>
      {partner.name[0]?.toUpperCase()}
    </div>
  );
}

function SocialLinks({ partner }: { partner: Partner }) {
  if (!partner.socialLinks || partner.socialLinks.length === 0) return null;
  return (
    <div className="mt-3 flex gap-3">
      {partner.socialLinks.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-gray-bg text-accent-gray-fg hover:bg-primary hover:text-white"
        >
          <Icon path={ICONS[socialIconFor(url)]} className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Partner | null>(null);

  useEffect(() => {
    apiGet<{ success: boolean; data?: Partner[]; message?: string }>("/api/partners/active").then(({ data }) => {
      if (data.success) {
        setPartners(data.data ?? []);
      } else {
        setError(data.message ?? "Could not load partners.");
      }
    });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-heading">Our Partners</h1>
      <p className="mt-1 text-sm text-muted">
        The pharmacies and providers we work with to get products and care to you.
      </p>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {!partners && !error && <p className="mt-6 text-sm text-muted">Loading partners...</p>}
      {partners && partners.length === 0 && <p className="mt-6 text-sm text-muted">No active partners right now.</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {partners?.map((partner) => (
          <button
            key={partner._id}
            onClick={() => setSelected(partner)}
            className="flex items-center gap-3 rounded-card bg-card-bg p-4 text-left shadow-atmospheric transition-shadow hover:shadow-lg"
          >
            <PartnerAvatar partner={partner} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-heading">{partner.name}</p>
              <p className="truncate text-sm text-muted">{partner.profession}</p>
            </div>
          </button>
        ))}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Partner">
        {selected && (
          <div>
            <div className="flex items-center gap-4">
              <PartnerAvatar partner={selected} size="lg" />
              <div>
                <p className="text-lg font-bold text-heading">{selected.name}</p>
                <p className="text-sm text-muted">{selected.profession}</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-body">{selected.businessAddress}</p>
            {selected.description && <p className="mt-3 text-sm text-body">{selected.description}</p>}

            <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-primary">
              {selected.phone && <a href={`tel:${selected.phone}`}>Call</a>}
              {selected.email && <a href={`mailto:${selected.email}`}>Email</a>}
              {selected.website && (
                <a
                  href={selected.website.startsWith("http") ? selected.website : `https://${selected.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Website
                </a>
              )}
            </div>

            <SocialLinks partner={selected} />
          </div>
        )}
      </Modal>
    </div>
  );
}
