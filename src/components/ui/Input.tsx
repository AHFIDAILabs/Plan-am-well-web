import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-heading">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className="h-14 w-full rounded-full border border-border bg-input-bg px-6 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
