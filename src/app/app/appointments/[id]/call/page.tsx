"use client";

import { useParams } from "next/navigation";
import { VideoCallRoom } from "@/components/call/VideoCallRoom";
import { GuestGate } from "@/components/auth/GuestGate";

export default function PatientVideoCallPage() {
  const params = useParams<{ id: string }>();
  return (
    <GuestGate feature="Video calls">
      <VideoCallRoom appointmentId={params.id} backHref={`/app/appointments/${params.id}`} />
    </GuestGate>
  );
}
