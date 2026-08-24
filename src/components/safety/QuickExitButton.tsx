"use client";

export function QuickExitButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        // .replace(), not .href — a real "quick exit" must not leave this
        // page reachable via the browser's back button afterward.
        window.location.replace("https://www.google.com");
      }}
      className={`rounded-full bg-error px-4 py-2 text-xs font-bold text-on-error transition-colors hover:brightness-95 ${className}`}
      aria-label="Quick exit — leave this site immediately"
    >
      Quick Exit
    </button>
  );
}
