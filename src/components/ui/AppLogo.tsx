export function AppLogo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-icon.png" alt="PlanAmWell" className={`${className} object-contain`} />
  );
}
