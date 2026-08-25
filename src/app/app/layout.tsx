import { PortalShell, NavItem } from "@/components/layout/PortalShell";

const PATIENT_NAV: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: "home" },
  { href: "/app/ask-amwell", label: "Ask AmWell AI", icon: "bot" },
  { href: "/app/doctors", label: "Consult a Doctor", icon: "video" },
  { href: "/app/appointments", label: "My Appointments", icon: "calendar" },
  { href: "/app/messages", label: "Messages & Calls", icon: "chat" },
  { href: "/app/pharmacy", label: "Order Products", icon: "pill" },
  { href: "/app/partners", label: "Our Partners", icon: "truck" },
  { href: "/app/clinics", label: "Find Services", icon: "pin" },
  { href: "/app/articles", label: "Health Articles", icon: "article" },
  { href: "/app/community", label: "Community Hub", icon: "people" },
  { href: "/app/reminders", label: "Med Reminders", icon: "alarm" },
  { href: "/app/records", label: "Medical Records", icon: "folder" },
  { href: "/app/family", label: "Family Profiles", icon: "people" },
  { href: "/app/notifications", label: "Notifications", icon: "notifications" },
  { href: "/app/profile", label: "Profile & Privacy", icon: "person" },
];

export default function PatientPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell navItems={PATIENT_NAV} variant="patient" notificationsHref="/app/notifications" profileHref="/app/profile">
      {children}
    </PortalShell>
  );
}
