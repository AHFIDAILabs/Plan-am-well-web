"use client";

import { useParams, useSearchParams } from "next/navigation";
import { VideoCallRoom } from "@/components/call/VideoCallRoom";

export default function DoctorVideoCallPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const callType = searchParams.get("type") === "audio" ? "audio" : "video";
  return <VideoCallRoom appointmentId={params.id} backHref="/provider/appointments" callType={callType} />;
}
