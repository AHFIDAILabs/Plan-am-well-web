"use client";

import { useParams } from "next/navigation";
import { ChatThread } from "@/components/chat/ChatThread";

export default function DoctorMessageThreadPage() {
  const params = useParams<{ appointmentId: string }>();
  return <ChatThread appointmentId={params.appointmentId} basePath="/provider/messages" />;
}
