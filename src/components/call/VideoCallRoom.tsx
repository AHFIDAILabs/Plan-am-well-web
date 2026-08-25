"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/context/SocketContext";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Icon, ICONS } from "@/components/ui/Icon";

// Same public fallback TURN server mobile's client already uses when the
// backend's /video/ice-servers call fails — not a new secret being introduced.
const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
];

type CallState = "starting" | "ringing" | "connecting" | "connected" | "ended" | "error";

export function VideoCallRoom({ appointmentId, backHref }: { appointmentId: string; backHref: string }) {
  const router = useRouter();
  const { socket, connected } = useSocket();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const isInitiatorRef = useRef(false);
  const readyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

  const [state, setState] = useState<CallState>("starting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

  useEffect(() => {
    if (!socket || !connected || startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;

    function cleanup() {
      if (readyIntervalRef.current) clearInterval(readyIntervalRef.current);
      socket!.off("webrtc-ready");
      socket!.off("webrtc-offer");
      socket!.off("webrtc-answer");
      socket!.off("webrtc-ice-candidate");
      socket!.off("call-ended");
      socket!.off("call-declined");
      socket!.emit("leave-appointment", { appointmentId });
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      pcRef.current = null;
    }

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const { data: tokenRes } = await apiPost<{
          success: boolean;
          data?: { isInitiator: boolean };
          message?: string;
        }>("/api/video/token", { appointmentId, callType: "video" });

        if (!tokenRes.success || !tokenRes.data) {
          throw new Error(tokenRes.message || "Could not start the call.");
        }
        isInitiatorRef.current = tokenRes.data.isInitiator;
        setState(tokenRes.data.isInitiator ? "ringing" : "connecting");

        let iceServers = FALLBACK_ICE_SERVERS;
        try {
          const { data: iceRes } = await apiGet<{ success: boolean; data?: { iceServers: RTCIceServer[] } }>(
            "/api/video/ice-servers"
          );
          if (iceRes.success && iceRes.data?.iceServers?.length) iceServers = iceRes.data.iceServers;
        } catch {
          // fall back silently
        }

        const pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
          setState("connected");
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket!.emit("webrtc-ice-candidate", { appointmentId, candidate: event.candidate });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") setState("connected");
          if (pc.connectionState === "failed") {
            setErrorMessage("The connection failed. Check your network and try again.");
            setState("error");
          }
        };

        socket!.emit("join-appointment", { appointmentId });

        async function makeOffer() {
          if (pc.signalingState !== "stable") return;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket!.emit("webrtc-offer", { appointmentId, offer });
        }

        socket!.on("webrtc-ready", (payload: { appointmentId: string }) => {
          if (payload.appointmentId !== appointmentId) return;
          if (isInitiatorRef.current) makeOffer();
        });

        socket!.on(
          "webrtc-offer",
          async (payload: { appointmentId: string; offer: RTCSessionDescriptionInit }) => {
            if (payload.appointmentId !== appointmentId) return;
            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket!.emit("webrtc-answer", { appointmentId, answer });
          }
        );

        socket!.on(
          "webrtc-answer",
          async (payload: { appointmentId: string; answer: RTCSessionDescriptionInit }) => {
            if (payload.appointmentId !== appointmentId) return;
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            }
          }
        );

        socket!.on(
          "webrtc-ice-candidate",
          async (payload: { appointmentId: string; candidate: RTCIceCandidateInit }) => {
            if (payload.appointmentId !== appointmentId) return;
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch {
              // benign if it arrives before the remote description is set
            }
          }
        );

        socket!.on("call-ended", (payload: { appointmentId: string }) => {
          if (payload.appointmentId !== appointmentId) return;
          setState("ended");
          cleanup();
        });

        socket!.on("call-declined", (payload: { appointmentId: string }) => {
          if (payload.appointmentId !== appointmentId) return;
          setErrorMessage("The call was declined.");
          setState("ended");
          cleanup();
        });

        socket!.emit("webrtc-ready", { appointmentId });
        readyIntervalRef.current = setInterval(() => {
          if (pc.connectionState === "connected") {
            if (readyIntervalRef.current) clearInterval(readyIntervalRef.current);
            return;
          }
          socket!.emit("webrtc-ready", { appointmentId });
        }, 5000);
      } catch (err: any) {
        setErrorMessage(err?.message || "Could not access your camera or microphone.");
        setState("error");
      }
    }

    start();

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, connected, appointmentId]);

  async function endCall() {
    await apiPost("/api/video/end-call", { appointmentId });
    setState("ended");
    router.push(backHref);
  }

  function toggleMic() {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    setMicOn((v) => !v);
  }

  function toggleCamera() {
    const nextOn = !cameraOn;
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = nextOn));
    setCameraOn(nextOn);
    socket?.emit("webrtc-call-mode-changed", { appointmentId, callMode: nextOn ? "video" : "audio" });
  }

  return (
    <div className="flex h-full min-h-[70vh] flex-col rounded-card bg-black text-white">
      <div className="relative flex-1 overflow-hidden rounded-card">
        <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full bg-black object-cover" />
        {state !== "connected" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-center">
            <p className="px-6 text-lg font-semibold">
              {state === "starting" && "Setting up your call…"}
              {state === "ringing" && "Ringing…"}
              {state === "connecting" && "Connecting…"}
              {state === "ended" && (errorMessage ?? "Call ended.")}
              {state === "error" && (errorMessage ?? "Something went wrong.")}
            </p>
          </div>
        )}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-4 right-4 h-32 w-24 rounded-lg border border-white/30 bg-black object-cover shadow-atmospheric"
        />
      </div>

      <div className="flex items-center justify-center gap-4 py-6">
        <button
          onClick={toggleMic}
          aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
          className={`flex h-14 w-14 items-center justify-center rounded-full ${
            micOn ? "bg-white/15 text-white" : "bg-white text-black"
          }`}
        >
          <Icon path={ICONS.mic} className="h-6 w-6" />
        </button>
        <button
          onClick={toggleCamera}
          aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
          className={`flex h-14 w-14 items-center justify-center rounded-full ${
            cameraOn ? "bg-white/15 text-white" : "bg-white text-black"
          }`}
        >
          <Icon path={ICONS.video} className="h-6 w-6" />
        </button>
        <Button
          onClick={endCall}
          aria-label="End call"
          className="!h-14 !w-14 !rounded-full !px-0 bg-red-600 text-white hover:bg-red-700"
        >
          <Icon path={ICONS.close} className="h-6 w-6" />
        </Button>
      </div>

      {state === "ended" && (
        <div className="pb-6 text-center">
          <Button variant="outline" onClick={() => router.push(backHref)} className="bg-white">
            Back to appointment
          </Button>
        </div>
      )}
    </div>
  );
}
