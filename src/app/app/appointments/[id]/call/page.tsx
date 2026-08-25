"use client";

import { useParams, useSearchParams } from "next/navigation";
import { VideoCallRoom } from "@/components/call/VideoCallRoom";
import { GuestGate } from "@/components/auth/GuestGate";

export default function PatientVideoCallPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const callType = searchParams.get("type") === "audio" ? "audio" : "video";
  return (
    <GuestGate feature="Video calls">
      <VideoCallRoom appointmentId={params.id} backHref={`/app/appointments/${params.id}`} callType={callType} />
    </GuestGate>
  );
}
