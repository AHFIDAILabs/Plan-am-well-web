import { Icon, ICONS, IconName } from "@/components/ui/Icon";
import { EventBannerPreset } from "@/lib/types";

interface PresetSpec {
  label: string;
  icon: IconName;
  gradient: string;
}

// Same fixed set as backend/src/models/Event.ts (EVENT_BANNER_PRESETS) —
// an admin picks one of these instead of uploading a photo. Gradients use
// only real design-system tokens (see web/DESIGN.md), no invented colors.
export const EVENT_BANNER_PRESETS: Record<EventBannerPreset, PresetSpec> = {
  "support-circle": {
    label: "Support Groups",
    icon: "people",
    gradient: "linear-gradient(135deg, #d81e5b 0%, #b10045 100%)",
  },
  workshop: {
    label: "Workshops & Learning",
    icon: "article",
    gradient: "linear-gradient(135deg, #feae2c 0%, #835500 100%)",
  },
  "qa-session": {
    label: "Q&A / Ask the Expert",
    icon: "chat",
    gradient: "linear-gradient(135deg, #0b71cd 0%, #0058a4 100%)",
  },
  wellness: {
    label: "Wellness & Safety",
    icon: "shield",
    gradient: "linear-gradient(135deg, #d81e5b 0%, #0b71cd 100%)",
  },
  celebration: {
    label: "Community & Social",
    icon: "star",
    gradient: "linear-gradient(135deg, #d81e5b 0%, #feae2c 50%, #0b71cd 100%)",
  },
};

const ICON_SIZE: Record<"sm" | "lg", string> = {
  sm: "h-8 w-8",
  lg: "h-14 w-14",
};

const BLOB_SIZE: Record<"sm" | "lg", string> = {
  sm: "h-16 w-16",
  lg: "h-32 w-32",
};

export function EventBanner({
  bannerImage,
  bannerPreset,
  size = "sm",
  className = "",
}: {
  bannerImage?: { url: string } | null;
  bannerPreset?: EventBannerPreset | null;
  size?: "sm" | "lg";
  className?: string;
}) {
  if (bannerImage?.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={bannerImage.url} alt="" className={`h-full w-full object-cover ${className}`} />
    );
  }

  const preset = (bannerPreset && EVENT_BANNER_PRESETS[bannerPreset]) || EVENT_BANNER_PRESETS.celebration;

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className}`}
      style={{ background: preset.gradient }}
    >
      <div className={`absolute -left-4 -top-4 rounded-full bg-white/15 ${BLOB_SIZE[size]}`} />
      <div className={`absolute -bottom-6 -right-2 rounded-full bg-white/10 ${BLOB_SIZE[size]}`} />
      <Icon path={ICONS[preset.icon]} className={`relative text-white/90 ${ICON_SIZE[size]}`} />
    </div>
  );
}
