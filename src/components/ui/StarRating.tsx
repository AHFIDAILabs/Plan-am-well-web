import { ICONS } from "@/components/ui/Icon";

export function Star({ filled, className = "h-4 w-4" }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
      className={className}
    >
      <path d={ICONS.star} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StarRow({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex gap-0.5 text-secondary">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= Math.round(rating)} className={size} />
      ))}
    </div>
  );
}
