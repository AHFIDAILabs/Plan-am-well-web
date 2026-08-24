import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "tertiary" | "outline" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-dark shadow-sm",
  secondary: "bg-secondary text-on-secondary hover:brightness-95 shadow-sm",
  tertiary: "bg-tertiary text-on-tertiary hover:brightness-95 shadow-sm",
  outline: "bg-white text-primary border border-primary hover:bg-accent-pink-bg",
  ghost: "bg-transparent text-body hover:bg-black/5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading, disabled, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex h-14 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {loading && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
