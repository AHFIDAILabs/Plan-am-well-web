import { ConversationList } from "@/components/chat/ConversationList";

export default function DoctorMessagesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-heading">Messages &amp; Calls</h1>
      <p className="mt-1 text-sm text-muted">Chat with patients from your confirmed appointments.</p>
      <ConversationList basePath="/provider/messages" />
    </div>
  );
}
