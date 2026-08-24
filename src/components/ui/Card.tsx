import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = "p-6", className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-card bg-card-bg shadow-atmospheric ${padding} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";
