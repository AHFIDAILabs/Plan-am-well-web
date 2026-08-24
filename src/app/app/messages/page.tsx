import { ConversationList } from "@/components/chat/ConversationList";
import { GuestGate } from "@/components/auth/GuestGate";

export default function MessagesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-heading">Messages &amp; Calls</h1>
      <p className="mt-1 text-sm text-muted">Chat with doctors from your confirmed appointments.</p>
      <GuestGate feature="Messages & Calls">
        <ConversationList basePath="/app/messages" />
      </GuestGate>
    </div>
  );
}
