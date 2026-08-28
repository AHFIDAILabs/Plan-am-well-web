import { NotificationsList } from "@/components/notifications/NotificationsList";
import { GuestGate } from "@/components/auth/GuestGate";

export default function PatientNotificationsPage() {
  return (
    <GuestGate feature="Notifications">
      <NotificationsList
        appointmentsPath="/app/appointments"
        appointmentDetailBase="/app/appointments"
        messagesPath="/app/messages"
        ordersPath="/app/orders"
      />
    </GuestGate>
  );
}
