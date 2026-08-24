import { PortalShell, NavItem } from "@/components/layout/PortalShell";

const DOCTOR_NAV: NavItem[] = [
  { href: "/provider", label: "Dashboard", icon: "home" },
  { href: "/provider/appointments", label: "Appointment Requests", icon: "calendar" },
  { href: "/provider/messages", label: "Messages & Calls", icon: "chat" },
  { href: "/provider/patients", label: "My Patients", icon: "people" },
  { href: "/provider/notifications", label: "Notifications", icon: "notifications" },
  { href: "/provider/profile", label: "Profile & Approval", icon: "person" },
];

export default function DoctorPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell navItems={DOCTOR_NAV} variant="provider" notificationsHref="/provider/notifications" profileHref="/provider/profile">
      {children}
    </PortalShell>
  );
}
