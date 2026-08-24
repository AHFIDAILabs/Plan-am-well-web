import { HTMLAttributes } from "react";

type Variant = "pink" | "amber" | "gray" | "blue";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  pink: "bg-accent-pink-bg text-accent-pink-fg",
  amber: "bg-accent-amber-bg text-accent-amber-fg",
  gray: "bg-accent-gray-bg text-accent-gray-fg",
  blue: "bg-accent-blue-bg text-accent-blue-fg",
};

export function Badge({ variant = "gray", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
