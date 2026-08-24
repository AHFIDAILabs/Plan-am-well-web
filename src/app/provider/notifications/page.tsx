import { NotificationsList } from "@/components/notifications/NotificationsList";

export default function DoctorNotificationsPage() {
  return <NotificationsList appointmentsPath="/provider/appointments" messagesPath="/provider/messages" />;
}
