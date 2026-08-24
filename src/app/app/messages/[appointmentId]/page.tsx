"use client";

import { useParams } from "next/navigation";
import { ChatThread } from "@/components/chat/ChatThread";
import { GuestGate } from "@/components/auth/GuestGate";

export default function MessageThreadPage() {
  const params = useParams<{ appointmentId: string }>();
  return (
    <GuestGate feature="Messages & Calls">
      <ChatThread appointmentId={params.appointmentId} basePath="/app/messages" />
    </GuestGate>
  );
}
