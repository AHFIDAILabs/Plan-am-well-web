"use client";

import { useParams } from "next/navigation";
import { VideoCallRoom } from "@/components/call/VideoCallRoom";

export default function DoctorVideoCallPage() {
  const params = useParams<{ id: string }>();
  return <VideoCallRoom appointmentId={params.id} backHref="/provider/appointments" />;
}
